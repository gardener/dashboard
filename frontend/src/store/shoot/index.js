//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  defineStore,
  acceptHMRUpdate,
} from 'pinia'
import {
  computed,
  reactive,
  watch,
  markRaw,
  toRaw,
} from 'vue'
import { useDocumentVisibility } from '@vueuse/core'

import { useLogger } from '@/composables/useLogger'
import { useApi } from '@/composables/useApi'

import { isNotFound } from '@/utils/error'
import { isTooManyRequestsError } from '@/utils/errors'

import { useAppStore } from '../app'
import { useAuthnStore } from '../authn'
import { useAuthzStore } from '../authz'
import { useCloudProfileStore } from '../cloudProfile'
import { useConfigStore } from '../config'
import { useGardenerExtensionStore } from '../gardenerExtension'
import { useProjectStore } from '../project'
import { useSecretStore } from '../secret'
import { useSocketStore } from '../socket'
import { useTicketStore } from '../ticket'
import { useLocalStorageStore } from '../localStorage'
import { useShootStagingStore } from '../shootStaging'

import {
  createShootResource,
  constants,
  onlyAllShootsWithIssues,
  getFilteredUids,
  searchItemsFn,
  sortItemsFn,
  shootHasIssue,
} from './helper'

import {
  cloneDeep,
  get,
  map,
  pick,
  difference,
  find,
  includes,
  throttle,
  isEmpty,
  isEqual,
} from '@/lodash'

export const useShootStore = defineStore('shoot', () => {
  const api = useApi()
  const logger = useLogger()
  const visibility = useDocumentVisibility()

  const appStore = useAppStore()
  const authnStore = useAuthnStore()
  const authzStore = useAuthzStore()
  const cloudProfileStore = useCloudProfileStore()
  const configStore = useConfigStore()
  const secretStore = useSecretStore()
  const gardenerExtensionStore = useGardenerExtensionStore()
  const ticketStore = useTicketStore()
  const socketStore = useSocketStore()
  const projectStore = useProjectStore()
  const localStorageStore = useLocalStorageStore()
  const shootStagingStore = useShootStagingStore()

  const context = {
    api,
    logger,
    appStore,
    authzStore,
    cloudProfileStore,
    configStore,
    secretStore,
    gardenerExtensionStore,
    ticketStore,
    socketStore,
    projectStore,
  }

  const state = reactive({
    shoots: {},
    shootInfos: {},
    staleShoots: {}, // shoots will be moved here when they are removed in case focus mode is active
    selection: undefined,
    shootListFilters: undefined,
    newShootResource: undefined,
    initialNewShootResource: undefined,
    focusMode: false,
    froozenUids: [],
    subscription: null,
    subscriptionState: constants.CLOSED,
    subscriptionError: null,
    subscriptionEventHandler: undefined,
    sortBy: undefined,
  })
  const shootEvents = new Map()

  // state
  const staleShoots = computed(() => {
    return state.staleShoots
  })

  const activeShoots = computed(() => {
    return activeUids.value.map(uid => state.shoots[uid])
  })

  const activeUids = computed(() => {
    return getFilteredUids(state, context)
  })

  const shootListFilters = computed(() => {
    return state.shootListFilters
  })

  const newShootResource = computed(() => {
    return state.newShootResource
  })

  const initialNewShootResource = computed(() => {
    return state.initialNewShootResource
  })

  const focusMode = computed(() => {
    return state.focusMode
  })

  const subscriptionState = computed(() => {
    return state.subscriptionState
  })

  const subscriptionError = computed(() => {
    return state.subscriptionError
  })

  const sortBy = computed(() => {
    return state.sortBy
  })

  // getters
  const shootList = computed(() => {
    if (state.focusMode) {
      // When state is freezed, do not include new items
      return state.froozenUids.map(uid => {
        const object = state.shoots[uid] ?? state.staleShoots[uid]
        return assignShootInfo(object)
      })
    }
    return activeUids.value.map(uid => {
      const object = state.shoots[uid]
      return assignShootInfo(object)
    })
  })

  const selectedShoot = computed(() => {
    return state.selectedUid
      ? assignShootInfo(state.shoots[state.selectedUid])
      : null
  })

  const onlyShootsWithIssues = computed(() => {
    return get(state.shootListFilters, 'onlyShootsWithIssues', true)
  })

  const loading = computed(() => {
    return state.subscriptionState === constants.LOADING
  })

  const subscribed = computed(() => {
    return state.subscriptionState === constants.OPEN
  })

  const unsubscribed = computed(() => {
    return state.subscriptionState === constants.CLOSED
  })

  const subscription = computed(() => {
    const metadata = state.subscription
    if (!metadata) {
      return null
    }
    const {
      namespace = authzStore.namespace,
      name,
    } = metadata
    if (!namespace) {
      return null
    }
    if (name) {
      return { namespace, name }
    }
    if (namespace === '_all' && onlyShootsWithIssues.value) {
      return { namespace, labelSelector: 'shoot.gardener.cloud/status!=healthy' }
    }
    return { namespace }
  })

  const numberOfNewItemsSinceFreeze = computed(() => {
    if (!state.focusMode) {
      return 0
    }
    return difference(activeUids.value, state.froozenUids).length
  })

  // actions
  function clearAll () {
    const shootStore = this
    shootStore.$patch(({ state }) => {
      state.shoots = {}
      state.shootInfos = {}
      state.staleShoots = {}
    })
    shootEvents.clear()
    ticketStore.clearIssues()
    ticketStore.clearComments()
  }

  function setSubscriptionState (state, value) {
    if (value > 0 && value !== state.subscriptionState + 1) {
      logger.warn('Unexpected subscription state change: %d --> %d', state.subscriptionState, value)
    }
    state.subscriptionState = value
    state.subscriptionError = null
  }

  function setSubscriptionError (state, err) {
    if (err) {
      const name = err.name
      const statusCode = get(err, 'response.status', 500)
      const message = get(err, 'response.data.message', err.message)
      const reason = get(err, 'response.data.reason', 'InternalError')
      const code = get(err, 'response.data.code', 500)
      state.subscriptionError = {
        name,
        statusCode,
        message,
        code,
        reason,
      }
      logger.error('Subscription failed: %d %s - %s', statusCode, name, message)
    } else {
      state.subscriptionError = null
    }
  }

  async function subscribe (metadata = {}) {
    const shootStore = this
    const {
      namespace = authzStore.namespace,
      name,
    } = metadata
    if (state.subscription) {
      await shootStore.unsubscribe()
    }
    shootStore.$patch(({ state }) => {
      state.subscription = { namespace, name }
      setSubscriptionState(state, constants.DEFINED)
    })
    await shootStore.synchronize()
  }

  function subscribeShoots (metadata) {
    (async shootStore => {
      try {
        await shootStore.subscribe(metadata)
      } catch (err) {
        appStore.setError(err)
      }
    })(this)
  }

  async function unsubscribe () {
    const shootStore = this
    await shootStore.closeSubscription()
    shootStore.clearAll()
  }

  function unsubscribeShoots () {
    (async shootStore => {
      try {
        await shootStore.unsubscribe()
      } catch (err) {
        appStore.setError(err)
      }
    })(this)
  }

  const synchronizeLock = {
    expiresAt: 0,
    options: null,
    aquire (options) {
      if (isEqual(this.options, options) && this.expiresAt > Date.now()) {
        logger.warn('Detected concurrent synchronization attempts for the same shoot subscription')
        return false
      }
      this.expiresAt = Date.now() + 30_000
      this.options = { ...options }
      return true
    },
    release () {
      this.expiresAt = 0
      this.options = null
    },
  }

  function synchronize () {
    const shootStore = this

    const fetchShoot = async options => {
      const [
        { data: shoot },
        { data: { issues = [], comments = [] } },
      ] = await Promise.all([
        api.getShoot(options),
        api.getIssuesAndComments(options),
      ])
      // fetch shootInfo in the background (do not await the promise)
      shootStore.fetchInfo(shoot.metadata)
      logger.debug('Fetched shoot and tickets for %s in namespace %s', options.name, options.namespace)
      return { shoots: [shoot], issues, comments }
    }

    const fetchShoots = async options => {
      const { namespace } = options
      const [
        { data: { items } },
        { data: { issues = [] } },
      ] = await Promise.all([
        api.getShoots(options),
        api.getIssues({ namespace }),
      ])
      logger.debug('Fetched shoots and tickets in namespace %s', options.namespace)
      return { shoots: items, issues, comments: [] }
    }

    const getThrottleDelay = (options, n) => {
      if (options.name) {
        return 0
      }
      const p = n > 0
        ? Math.pow(10, Math.floor(Math.log10(n)))
        : 1
      const m = configStore.throttleDelayPerCluster
      const d = m * p * Math.round(n / p)
      return Math.min(30_000, Math.max(200, d))
    }

    // await and handle response data in the background
    const fetchData = async options => {
      let throttleDelay
      // check if a synchronize operation with the same options is already in progress and hasn't expired.
      if (!synchronizeLock.aquire(options)) {
        return
      }
      try {
        setSubscriptionState(state, constants.LOADING)
        const promise = options.name
          ? fetchShoot(options)
          : fetchShoots({
            useCache: localStorageStore.shootListFetchFromCache,
            ...options,
          })
        const { shoots, issues, comments } = await promise
        shootStore.receive(shoots)
        ticketStore.receiveIssues(issues)
        ticketStore.receiveComments(comments)
        setSubscriptionState(state, constants.LOADED)
        throttleDelay = getThrottleDelay(options, shoots.length)
      } catch (err) {
        shootStore.clearAll()
        if (isNotFound(err) && options.name) {
          setSubscriptionState(state, constants.LOADED)
          throttleDelay = getThrottleDelay(options, 1)
        } else {
          const message = get(err, 'response.data.message', err.message)
          logger.error('Failed to fetch shoots or tickets: %s', message)
          setSubscriptionError(state, err)
        }
        throw err
      } finally {
        synchronizeLock.release()
        if (state.subscriptionState === constants.LOADED) {
          await shootStore.openSubscription(options, throttleDelay)
        }
      }
    }

    const options = toRaw(subscription.value)
    if (!isEmpty(options)) {
      return fetchData(options)
    }
  }

  async function createShoot (data) {
    const namespace = data.metadata.namespace || authzStore.namespace
    const response = await api.createShoot({ namespace, data })
    appStore.setSuccess('Cluster created')
    return response
  }

  async function deleteShoot ({ namespace, name }) {
    const response = await api.deleteShoot({ namespace, name })
    appStore.setSuccess('Cluster marked for deletion')
    return response
  }

  async function fetchInfo (metadata) {
    if (!metadata) {
      return
    }
    try {
      const { data: info } = await api.getShootInfo(metadata)
      if (info.seedShootIngressDomain) {
        const baseHost = info.seedShootIngressDomain
        info.plutonoUrl = `https://gu-${baseHost}`

        info.prometheusUrl = `https://p-${baseHost}`

        info.alertmanagerUrl = `https://au-${baseHost}`
      }
      state.shootInfos[metadata.uid] = markRaw(info)
    } catch (err) {
      // ignore shoot info not found
      if (isNotFound(err)) {
        return
      }
      logger.error('Failed to fetch shoot info:', err.message)
    }
  }

  function assignShootInfo (object) {
    const uid = object?.metadata.uid
    const info = state.shootInfos[uid]
    return {
      ...object,
      info,
    }
  }

  function setSelection (metadata) {
    const shootStore = this
    if (!metadata) {
      state.selectedUid = null
    } else {
      const uid = metadata.uid
      state.selectedUid = uid
      const shootInfo = state.shootInfos[uid]
      if (!shootInfo) {
        shootStore.fetchInfo(metadata)
      }
    }
  }

  function initializeShootListFilters () {
    const isAdmin = authnStore.isAdmin
    state.shootListFilters = {
      onlyShootsWithIssues: isAdmin,
      progressing: true,
      noOperatorAction: isAdmin,
      deactivatedReconciliation: isAdmin,
      hideTicketsWithLabel: isAdmin,
      ...localStorageStore.allProjectsShootFilter,
    }
  }

  function toogleShootListFilter (key) {
    if (state.shootListFilters) {
      state.shootListFilters[key] = !state.shootListFilters[key]
    }
  }

  watch(() => state.shootListFilters, value => {
    localStorageStore.allProjectsShootFilter = pick(value, [
      'onlyShootsWithIssues',
      'progressing',
      'noOperatorAction',
      'deactivatedReconciliation',
      'hideTicketsWithLabel',
    ])
  }, {
    deep: true,
  })

  function setNewShootResource (value) {
    state.newShootResource = value
  }

  function resetNewShootResource () {
    const shootStore = this
    const value = createShootResource({
      logger,
      appStore,
      authzStore,
      configStore,
      secretStore,
      cloudProfileStore,
      gardenerExtensionStore,
    })
    shootStore.$patch(({ state }) => {
      state.newShootResource = value
      state.initialNewShootResource = cloneDeep(value)
    })
    shootStagingStore.workerless = false
  }

  function setFocusMode (value) {
    const shootStore = this
    let uids = []
    if (value) {
      const activeShoots = map(activeUids.value, uid => state.shoots[uid])
      const sortedShoots = sortItems(activeShoots, state.sortBy)
      uids = map(sortedShoots, 'metadata.uid')
    }
    shootStore.$patch(({ state }) => {
      state.focusMode = value
      state.froozenUids = uids
    })
  }

  const searchItems = searchItemsFn(state, context)
  const sortItems = sortItemsFn(state, context)

  function shootByNamespaceAndName ({ namespace, name } = {}) {
    if (!(namespace && name)) {
      return
    }
    const object = find(Object.values(state.shoots), { metadata: { namespace, name } })
    if (!object) {
      return
    }
    return assignShootInfo(object)
  }

  function setSortBy (value) {
    state.sortBy = value
  }

  function receive (items) {
    const shootStore = this
    const notOnlyShootsWithIssues = !onlyAllShootsWithIssues(state, context)

    const shoots = {}
    for (const item of items) {
      if (notOnlyShootsWithIssues || shootHasIssue(item)) {
        const uid = item.metadata.uid
        shoots[uid] = markRaw(item)
      }
    }

    shootStore.$patch(({ state }) => {
      if (state.focusMode) {
        const oldUids = Object.keys(state.shoots)
        const newUids = Object.keys(shoots)
        for (const uid of difference(oldUids, newUids)) {
          if (includes(state.froozenUids, uid)) {
            state.staleShoots[uid] = state.shoots[uid]
          }
        }
        for (const uid of difference(newUids, oldUids)) {
          delete state.staleShoots[uid]
        }
      }
      state.shoots = shoots
    })
  }

  function cancelSubscriptionEventHandler (state) {
    if (typeof state.subscriptionEventHandler?.cancel === 'function') {
      state.subscriptionEventHandler.cancel()
    }
  }

  function setSubscriptionEventHandler (state, func, throttleDelay) {
    if (throttleDelay > 0) {
      func = throttle(func, throttleDelay)
    }
    state.subscriptionEventHandler = markRaw(func)
  }

  function unsetSubscriptionEventHandler (state) {
    state.subscriptionEventHandler = undefined
  }

  async function openSubscription (value, throttleDelay) {
    const shootStore = this
    shootStore.$patch(({ state }) => {
      setSubscriptionState(state, constants.OPENING)
      cancelSubscriptionEventHandler(state)
      shootEvents.clear()
      setSubscriptionEventHandler(state, handleEvents, throttleDelay)
    })
    try {
      await socketStore.emitSubscribe(value)
      setSubscriptionState(state, constants.OPEN)
    } catch (err) {
      logger.error('Failed to open subscription: %s', err.message)
      setSubscriptionError(state, err)
    }
  }

  async function closeSubscription () {
    const shootStore = this
    shootStore.$patch(({ state }) => {
      state.subscription = null
      setSubscriptionState(state, constants.CLOSING)
      cancelSubscriptionEventHandler(state)
      shootEvents.clear()
      unsetSubscriptionEventHandler(state)
    })
    try {
      await socketStore.emitUnsubscribe()
      setSubscriptionState(state, constants.CLOSED)
    } catch (err) {
      logger.error('Failed to close subscription: %s', err.message)
      setSubscriptionError(state, err)
    }
  }

  async function handleEvents (shootStore) {
    const events = Array.from(shootEvents.values())
    shootEvents.clear()
    const uids = []
    const deletedUids = []
    for (const { type, uid } of events) {
      if (type === 'DELETED') {
        deletedUids.push(uid)
      } else {
        uids.push(uid)
      }
    }
    try {
      const items = await socketStore.synchronize(uids)
      const notOnlyShootsWithIssues = !onlyAllShootsWithIssues(state, context)
      shootStore.$patch(({ state }) => {
        for (const uid of deletedUids) {
          if (state.focusMode) {
            state.staleShoots[uid] = state.shoots[uid]
          }
          delete state.shoots[uid]
        }
        for (const item of items) {
          if (item.kind === 'Status') {
            logger.info('Failed to synchronize a single shoot: %s', item.message)
            if (item.code === 404) {
              const uid = item.details?.uid
              if (uid) {
                delete state.shoots[uid]
              }
            }
          } else if (notOnlyShootsWithIssues || shootHasIssue(item)) {
            const uid = item.metadata.uid
            if (state.focusMode) {
              delete state.staleShoots[uid]
            }
            state.shoots[uid] = markRaw(item)
          }
        }
      })
    } catch (err) {
      if (isTooManyRequestsError(err)) {
        logger.info('Skipped synchronization of modified shoots: %s', err.message)
      } else {
        logger.error('Failed to synchronize modified shoots: %s', err.message)
      }
      // Synchronization failed. Rollback shoot events
      for (const event of events) {
        const { uid } = event
        if (!shootEvents.has(uid)) {
          shootEvents.set(uid, event)
        }
      }
    }
  }

  function handleEvent (event) {
    const shootStore = this
    const { type, uid } = event
    if (!['ADDED', 'MODIFIED', 'DELETED'].includes(type)) {
      logger.error('undhandled event type', type)
      return
    }
    shootEvents.set(uid, event)
    shootStore.invokeSubscriptionEventHandler()
  }

  function isShootActive (uid) {
    return includes(activeUids.value, uid)
  }

  function invokeSubscriptionEventHandler () {
    if (typeof state.subscriptionEventHandler === 'function' && visibility.value === 'visible') {
      state.subscriptionEventHandler(this)
    }
  }

  return {
    // state
    state,
    staleShoots,
    newShootResource,
    initialNewShootResource,
    shootListFilters,
    subscriptionState,
    subscriptionError,
    focusMode,
    sortBy,
    // getters
    activeShoots,
    shootList,
    selectedShoot,
    onlyShootsWithIssues,
    loading,
    subscribed,
    unsubscribed,
    subscription,
    numberOfNewItemsSinceFreeze,
    // actions
    receive,
    synchronize,
    clearAll,
    subscribe,
    subscribeShoots,
    openSubscription,
    unsubscribe,
    unsubscribeShoots,
    closeSubscription,
    handleEvent,
    createShoot,
    deleteShoot,
    fetchInfo,
    setSelection,
    initializeShootListFilters,
    toogleShootListFilter,
    setNewShootResource,
    resetNewShootResource,
    setFocusMode,
    shootByNamespaceAndName,
    searchItems,
    sortItems,
    setSortBy,
    isShootActive,
    invokeSubscriptionEventHandler,
  }
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useShootStore, import.meta.hot))
}
