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
} from 'vue'

import { useLogger } from '@/composables/useLogger'
import { useApi } from '@/composables/useApi'

import { isNotFound } from '@/utils/error'

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
  uriPattern,
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
  replace,
  difference,
  find,
  includes,
  throttle,
} from '@/lodash'

export const useShootStore = defineStore('shoot', () => {
  const api = useApi()
  const logger = useLogger()

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
      ? state.shoots[state.selectedUid]
      : null
  })

  const onlyShootsWithIssues = computed(() => {
    return get(state.shootListFilters, 'onlyShootsWithIssues', true)
  })

  const loading = computed(() => {
    return state.subscriptionState > constants.DEFINED && state.subscriptionState < constants.OPEN
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
    ticketStore.clearIssues()
    ticketStore.clearComments()
  }

  function subscribe (metadata = {}) {
    const shootStore = this
    const {
      namespace = authzStore.namespace,
      name,
    } = metadata
    shootStore.$patch(({ state }) => {
      state.subscription = { namespace, name }
      state.subscriptionState = constants.DEFINED
      state.subscriptionError = null
    })
    return shootStore.synchronize()
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

  function unsubscribe () {
    const shootStore = this
    shootStore.closeSubscription()
    shootStore.clearAll()
  }

  function unsubscribeShoots () {
    (shootStore => {
      try {
        shootStore.unsubscribe()
      } catch (err) {
        appStore.setError(err)
      }
    })(this)
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

    const getThrottleDelay = (options, numberOfShoots) => {
      if (options.name) {
        return 0
      }
      return numberOfShoots > 50
        ? 3_000
        : 1_000
    }

    // await and handle response data in the background
    const fetchData = async options => {
      let throttleDelay
      try {
        setSubscriptionState(constants.LOADING)
        const promise = options.name
          ? fetchShoot(options)
          : fetchShoots(options)
        const { shoots, issues, comments } = await promise
        shootStore.receive(shoots)
        ticketStore.receiveIssues(issues)
        ticketStore.receiveComments(comments)
        throttleDelay = getThrottleDelay(options, shoots.length)
      } catch (err) {
        if (options.name && isNotFound(err)) {
          throttleDelay = 0
        } else {
          const message = get(err, 'response.data.message', err.message)
          logger.error('Failed to fetch shoots or tickets: %s', message)
          setSubscriptionError(err)
          shootStore.clearAll()
          ticketStore.clearIssues()
          ticketStore.clearComments()
        }
        throw err
      } finally {
        if (typeof throttleDelay === 'number') {
          shootStore.openSubscription(options, { throttleDelay })
        }
      }
    }

    const options = subscription.value
    if (options) {
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
      if (info.serverUrl) {
        const [, scheme, host] = uriPattern.exec(info.serverUrl)
        const authority = `//${replace(host, /^\/\//, '')}`
        const pathname = info.dashboardUrlPath
        info.dashboardUrl = [scheme, authority, pathname].join('')
        info.dashboardUrlText = [scheme, host].join('')
      }
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

  function setSubscriptionState (value) {
    if (Object.values(constants).includes(value)) {
      state.subscriptionState = value
    } else if (Object.keys(constants).includes(value)) {
      state.subscriptionState = constants[value]
    }
  }

  function setSubscriptionError (err) {
    if (err) {
      const name = err.name
      const statusCode = get(err, 'response.status', 500)
      const message = get(err, 'response.data.message', err.message)
      const reason = get(err, 'response.data.reason')
      const code = get(err, 'response.data.code', 500)
      state.subscriptionError = {
        name,
        statusCode,
        message,
        code,
        reason,
      }
    } else {
      state.subscriptionError = null
    }
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

  function setSubscriptionEventHandler (state, func, throttleDelay) {
    if (typeof state.subscriptionEventHandler?.cancel === 'function') {
      state.subscriptionEventHandler.cancel()
    }
    shootEvents.clear()
    if (throttleDelay > 0) {
      func = throttle(func, throttleDelay)
    }
    state.subscriptionEventHandler = typeof func === 'function'
      ? markRaw(func)
      : undefined
  }

  function openSubscription (value, options) {
    const shootStore = this

    shootStore.$patch(({ state }) => {
      state.subscriptionState = constants.OPENING
      state.subscriptionError = null
      setSubscriptionEventHandler(state, handleEvents, options?.throttleDelay)
    })
    socketStore.emitSubscribe(value)
  }

  function closeSubscription () {
    const shootStore = this
    shootStore.$patch(({ state }) => {
      state.subscriptionState = constants.CLOSING
      state.subscriptionError = null
      state.subscription = null
      setSubscriptionEventHandler(state)
    })
    socketStore.emitUnsubscribe()
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
      logger.error('Failed to synchronize all modified shoots: %s', err.message)
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
    const { type, uid } = event
    if (!['ADDED', 'MODIFIED', 'DELETED'].includes(type)) {
      logger.error('undhandled event type', type)
      return
    }
    shootEvents.set(uid, event)
    const throttledHandleEvents = state.subscriptionEventHandler
    if (typeof throttledHandleEvents === 'function') {
      throttledHandleEvents(this)
    }
  }

  function isShootActive (uid) {
    return includes(activeUids.value, uid)
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
    setSubscriptionState,
    setSubscriptionError,
    isShootActive,
  }
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useShootStore, import.meta.hot))
}
