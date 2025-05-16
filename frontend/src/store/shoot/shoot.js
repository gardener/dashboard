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
  toRef,
} from 'vue'

import { useLogger } from '@/composables/useLogger'
import { useApi } from '@/composables/useApi'
import { useProjectShootCustomFields } from '@/composables/useProjectShootCustomFields'
import { useSocketEventHandler } from '@/composables/useSocketEventHandler'

import { isNotFound } from '@/utils/error'

import { useAppStore } from '../app'
import { useAuthnStore } from '../authn'
import { useAuthzStore } from '../authz'
import { useProjectStore } from '../project'
import { useCloudProfileStore } from '../cloudProfile'
import { useConfigStore } from '../config'
import { useGardenerExtensionStore } from '../gardenerExtension'
import { useCredentialStore } from '../credential'
import { useSocketStore } from '../socket'
import { useTicketStore } from '../ticket'
import { useSeedStore } from '../seed'
import { useLocalStorageStore } from '../localStorage'

import {
  constants,
  onlyAllShootsWithIssues,
  getFilteredUids,
  searchItemsFn,
  sortItemsFn,
  shootHasIssue,
} from './helper'

import isEqual from 'lodash/isEqual'
import isEmpty from 'lodash/isEmpty'
import includes from 'lodash/includes'
import find from 'lodash/find'
import difference from 'lodash/difference'
import pick from 'lodash/pick'
import map from 'lodash/map'
import unset from 'lodash/unset'
import set from 'lodash/set'
import get from 'lodash/get'

const useShootStore = defineStore('shoot', () => {
  const api = useApi()
  const logger = useLogger()

  const appStore = useAppStore()
  const authnStore = useAuthnStore()
  const authzStore = useAuthzStore()
  const projectStore = useProjectStore()
  const cloudProfileStore = useCloudProfileStore()
  const configStore = useConfigStore()
  const credentialStore = useCredentialStore()
  const gardenerExtensionStore = useGardenerExtensionStore()
  const ticketStore = useTicketStore()
  const socketStore = useSocketStore()
  const seedStore = useSeedStore()
  const localStorageStore = useLocalStorageStore()

  const projectItem = toRef(projectStore, 'project')

  const shootCustomFieldsComposable = useProjectShootCustomFields(projectItem, { logger })

  const context = {
    api,
    logger,
    appStore,
    authzStore,
    projectStore,
    cloudProfileStore,
    configStore,
    credentialStore,
    gardenerExtensionStore,
    ticketStore,
    socketStore,
    seedStore,
    shootCustomFieldsComposable,
  }

  const state = reactive({
    shoots: {},
    shootInfos: {},
    staleShoots: {}, // shoots will be moved here when they are removed in case focus mode is active
    selection: undefined,
    shootListFilters: undefined,
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
    return activeUids.value.map(uid => get(state.shoots, [uid]))
  })

  const activeUids = computed(() => {
    return getFilteredUids(state, context)
  })

  const shootListFilters = computed(() => {
    return state.shootListFilters
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
    const uids = state.focusMode
      ? state.froozenUids
      : activeUids.value
    const getShoot = state.focusMode
      ? uid => get(state.shoots, [uid]) ?? get(state.staleShoots, [uid])
      : uid => get(state.shoots, [uid])
    const items = []
    for (const uid of uids) {
      const object = getShoot(uid)
      if (object) {
        items.push(assignShootInfo(object))
      }
    }
    return items
  })

  const selectedShoot = computed(() => {
    return state.selectedUid
      ? assignShootInfo(state.shoots[state.selectedUid])
      : null
  })

  const onlyShootsWithIssues = computed(() => {
    return get(state.shootListFilters, ['onlyShootsWithIssues'], true)
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
      state.froozenUids = []
      state.focusMode = false
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
      const statusCode = get(err, ['response', 'status'], 500)
      const message = get(err, ['response', 'data', 'message'], err.message)
      const reason = get(err, ['response', 'data', 'reason'], 'InternalError')
      const code = get(err, ['response', 'data', 'code'], 500)
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
        { value: shootResult, reason: shootError },
        { value: issuesAndCommentsResult, reason: issuesAndCommentsError },
      ] = await Promise.allSettled([
        api.getShoot(options),
        api.getIssuesAndComments(options),
      ])
      if (shootError) {
        throw shootError
      }
      logger.debug('Fetched shoot for %s in namespace %s', options.name, options.namespace)
      if (issuesAndCommentsError) {
        logger.warn('Tickets could not be fetched:', issuesAndCommentsError.message)
      }
      const {
        issues = [],
        comments = [],
      } = issuesAndCommentsResult?.data ?? {}
      // fetch shootInfo in the background (do not await the promise)
      shootStore.fetchInfo(shootResult.data.metadata)
      return { shoots: [shootResult.data], issues, comments }
    }

    const fetchShoots = async options => {
      const { namespace } = options
      const [
        { value: shootsResult, reason: shootsError },
        { value: issuesResult, reason: issuesError },
      ] = await Promise.allSettled([
        api.getShoots(options),
        api.getIssues({ namespace }),
      ])
      if (shootsError) {
        throw shootsError
      }
      logger.debug('Fetched shoots in namespace %s', options.namespace)
      if (issuesError) {
        logger.warn('Error fetching issues:', issuesError.message)
      }
      const { items: shoots } = shootsResult?.data ?? {}
      const { issues = [] } = issuesResult?.data ?? {}
      return { shoots, issues, comments: [] }
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
          const message = get(err, ['response', 'data', 'message'], err.message)
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
    const info = get(state.shootInfos, [uid])
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
      const shootInfo = get(state.shootInfos, [uid])
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
      const value = get(state.shootListFilters, [key])
      set(state.shootListFilters, [key], !value)
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

  function setFocusMode (value) {
    const shootStore = this
    let uids = []
    if (value) {
      const activeShoots = map(activeUids.value, uid => get(state.shoots, [uid]))
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
        set(shoots, [uid], markRaw(item))
      }
    }

    shootStore.$patch(({ state }) => {
      if (state.focusMode) {
        const oldUids = Object.keys(state.shoots)
        const newUids = Object.keys(shoots)
        for (const uid of difference(oldUids, newUids)) {
          if (includes(state.froozenUids, uid)) {
            const value = get(state.shoots, [uid])
            set(state.staleShoots, [uid], value)
          }
        }
        for (const uid of difference(newUids, oldUids)) {
          unset(state.staleShoots, [uid])
        }
      }
      state.shoots = shoots
    })
  }

  async function openSubscription (value, throttleDelay) {
    const shootStore = this
    shootStore.$patch(({ state }) => {
      setSubscriptionState(state, constants.OPENING)
      state.subscriptionEventHandler = socketEventHandler.start(throttleDelay)
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
    if (state.subscriptionState === constants.CLOSED) {
      return
    }
    const shootStore = this
    shootStore.$patch(({ state }) => {
      state.subscription = null
      setSubscriptionState(state, constants.CLOSING)
      socketEventHandler.stop()
      state.subscriptionEventHandler = undefined
    })
    try {
      await socketStore.emitUnsubscribe()
      setSubscriptionState(state, constants.CLOSED)
    } catch (err) {
      logger.error('Failed to close subscription: %s', err.message)
      setSubscriptionError(state, err)
    }
  }

  function isShootActive (uid) {
    return includes(activeUids.value, uid)
  }

  const socketEventHandler = useSocketEventHandler(useShootStore, {
    logger,
    createOperator ({ state }) {
      const notOnlyShootsWithIssues = !onlyAllShootsWithIssues(state, context)
      return {
        set (uid, item) {
          if (notOnlyShootsWithIssues || shootHasIssue(item)) {
            if (state.focusMode) {
              unset(state.staleShoots, [uid])
            }
            set(state.shoots, [uid], markRaw(item))
          }
        },
        delete (uid) {
          if (state.focusMode) {
            const value = get(state.shoots, [uid])
            set(state.staleShoots, [uid], value)
          }
          unset(state.shoots, [uid])
        },
      }
    },
  })

  return {
    // state
    state,
    staleShoots,
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
    deleteShoot,
    fetchInfo,
    setSelection,
    initializeShootListFilters,
    toogleShootListFilter,
    setFocusMode,
    shootByNamespaceAndName,
    searchItems,
    sortItems,
    setSortBy,
    isShootActive,
    handleEvent: socketEventHandler.listener,
  }
})

export default useShootStore

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useShootStore, import.meta.hot))
}
