//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { defineStore } from 'pinia'
import { computed, reactive } from 'vue'

import { useApi, useLogger } from '@/composables'

import { useAppStore } from '../app'
import { useAuthzStore } from '../authz'
import { useCloudProfileStore } from '../cloudProfile'
import { useConfigStore } from '../config'
import { useGardenerExtensionStore } from '../gardenerExtension'
import { useProjectStore } from '../project'
import { useSecretStore } from '../secret'
import { useSocketStore } from '../socket'
import { useTicketStore } from '../ticket'

import {
  uriPattern,
  keyForShoot,
  findItem,
  createShootResource,
  constants,
  onlyAllShootsWithIssues,
  getFilteredItems,
  putItem,
  deleteItem,
  searchItemsFn,
  sortItemsFn,
} from './helper'

import { shootHasIssue } from '@/utils'
import { isNotFound } from '@/utils/error'

import cloneDeep from 'lodash/cloneDeep'
import get from 'lodash/get'
import map from 'lodash/map'
import replace from 'lodash/replace'
import difference from 'lodash/difference'
import differenceWith from 'lodash/differenceWith'
import find from 'lodash/find'

export const useShootStore = defineStore('shoot', () => {
  const api = useApi()
  const logger = useLogger()

  const appStore = useAppStore()
  const authzStore = useAuthzStore()
  const cloudProfileStore = useCloudProfileStore()
  const configStore = useConfigStore()
  const secretStore = useSecretStore()
  const gardenerExtensionStore = useGardenerExtensionStore()
  const ticketStore = useTicketStore()
  const socketStore = useSocketStore()
  const projectStore = useProjectStore()

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
    staleShoots: {}, // shoots will be moved here when they are removed in case focus mode is active
    sortedUidsAtFreeze: [],
    filteredShoots: [],
    selection: undefined,
    shootListFilters: undefined,
    newShootResource: undefined,
    initialNewShootResource: undefined,
    focusMode: false,
    subscription: null,
    subscriptionState: constants.CLOSED,
    subscriptionError: null,
    sortBy: undefined,
  })

  // state
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
      return map(state.sortedUidsAtFreeze, freezedUID => {
        const activeItem = find(state.filteredShoots, ['metadata.uid', freezedUID])
        if (activeItem) {
          return activeItem
        }
        let staleItem = state.staleShoots[freezedUID]
        if (!staleItem) {
          // Object may have been filtered (e.g. now progressing) but is still in shoots. Also show as stale in this case
          staleItem = find(Object.values(state.shoots), ['metadata.uid', freezedUID])
          if (!staleItem) {
            // This should never happen ...
            logger.error('Could not find freezed shoot with uid %s in shoots or staleShoots', freezedUID)
          }
        }
        return {
          ...staleItem,
          stale: true,
        }
      })
    }
    return state.filteredShoots
  })

  const selectedShoot = computed(() => {
    return state.selection
      ? shootByNamespaceAndName(state.selection)
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
    return differenceWith(state.filteredShoots, state.sortedUidsAtFreeze, (filteredShoot, uid) => {
      return filteredShoot.metadata.uid === uid
    }).length
  })

  // actions
  function clearAll () {
    clear()
    ticketStore.clearIssues()
    ticketStore.clearComments()
  }

  function subscribe (metadata = {}) {
    const {
      namespace = authzStore.namespace,
      name,
    } = metadata
    setSubscription({ namespace, name })
    return this.synchronize()
  }

  function unsubscribe () {
    closeSubscription()
    clearAll()
  }

  async function assignInfo (metadata) {
    if (metadata) {
      try {
        await fetchInfo(metadata)
      } catch (err) {
        logger.error('Failed to fetch shoot info:', err.message)
      }
    }
  }

  function synchronize () {
    const fetchShoot = async options => {
      const [
        { data: shoot },
        { data: { issues = [], comments = [] } },
      ] = await Promise.all([
        api.getShoot(options),
        api.getIssuesAndComments(options),
      ])
      // fetch shootInfo in the background (do not await the promise)
      assignInfo(shoot?.metadata)
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

    // await and handle response data in the background
    const fetchData = async options => {
      try {
        setSubscriptionState(constants.LOADING)
        const promise = options.name
          ? fetchShoot(options)
          : fetchShoots(options)
        const { shoots, issues, comments } = await promise
        receive(shoots)
        ticketStore.receiveIssues(issues)
        ticketStore.receiveComments(comments)
        openSubscription(options)
      } catch (err) {
        const message = get(err, 'response.data.message', err.message)
        logger.error('Failed to fetch shoots or tickets: %s', message)
        setSubscriptionError(err)
        clearAll()
        throw err
      }
    }

    const options = subscription.value
    if (options) {
      return fetchData(options)
    }
  }

  function createShoot (data) {
    const namespace = data.metadata.namespace || authzStore.namespace
    return api.createShoot({ namespace, data })
  }

  function deleteShoot ({ namespace, name }) {
    return api.deleteShoot({ namespace, name })
  }

  async function fetchInfo ({ name, namespace }) {
    try {
      const { data: info } = await api.getShootInfo({ namespace, name })
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
      receiveInfo({ name, namespace, info })
    } catch (error) {
      // shoot info not found -> ignore if KubernetesError
      if (isNotFound(error)) {
        return
      }
      throw error
    }
  }

  function setSelection (metadata) {
    if (!metadata) {
      state.selection = null
      return
    }
    const item = findItem(state)(metadata)
    if (item) {
      const { namespace, name } = metadata
      state.selection = { namespace, name }
      if (!item.info) {
        assignInfo(metadata)
      }
    }
  }

  function setShootListFilters (value) {
    state.shootListFilters = value
    state.filteredShoots = getFilteredItems(state, context)
  }

  function setShootListFilter (data) {
    if (state.shootListFilters) {
      const { filter, value } = data
      state.shootListFilters[filter] = value
      state.filteredShoots = getFilteredItems(state, context)
    }
  }

  function setNewShootResource (value) {
    state.newShootResource = value
  }

  function resetNewShootResource () {
    const value = createShootResource({
      logger,
      appStore,
      authzStore,
      configStore,
      secretStore,
      cloudProfileStore,
      gardenerExtensionStore,
    })

    state.newShootResource = value
    state.initialNewShootResource = cloneDeep(value)
  }

  function setFocusMode (value) {
    let sortedUids
    if (value) {
      const sortedShoots = sortItems([...state.filteredShoots], state.sortBy)
      sortedUids = map(sortedShoots, 'metadata.uid')
    }
    state.focusMode = value
    state.sortedUidsAtFreeze = sortedUids
  }

  const shootByNamespaceAndName = findItem(state)
  const searchItems = searchItemsFn(state, context)
  const sortItems = sortItemsFn(state, context)

  function setSortBy (value) {
    state.sortBy = value
  }

  function setSubscription (value) {
    state.subscription = value
    state.subscriptionState = constants.DEFINED
    state.subscriptionError = null
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

  // mutations
  function receive (items) {
    const notOnlyShootsWithIssues = !onlyAllShootsWithIssues(state, context)

    const shoots = {}
    for (const object of items) {
      if (notOnlyShootsWithIssues || shootHasIssue(object)) {
        const key = keyForShoot(object.metadata)
        shoots[key] = object
      }
    }

    if (state.focusMode) {
      const oldKeys = Object.keys(state.shoots)
      const newKeys = Object.keys(shoots)
      const removedShootKeys = difference(oldKeys, newKeys)
      const addedShootKeys = difference(newKeys, oldKeys)

      removedShootKeys.forEach(removedShootKey => {
        const removedShoot = state.shoots[removedShootKey]
        if (state.sortedUidsAtFreeze.includes(removedShoot.metadata.uid)) {
          const uid = removedShoot.metadata.uid
          state.staleShoots[uid] = {
            ...removedShoot,
            stale: true,
          }
        }
      })

      addedShootKeys.forEach(addedShootKey => {
        const addedShoot = shoots[addedShootKey]
        const uid = addedShoot.metadata.uid
        delete state.staleShoots[uid]
      })
    }

    state.shoots = shoots
    state.filteredShoots = getFilteredItems(state, context)
  }

  function receiveInfo ({ namespace, name, info }) {
    const item = findItem(state)({ namespace, name })
    if (item !== undefined) {
      item.info = info
    }
  }

  function clear () {
    state.shoots = {}
    state.staleShoots = {}
  }

  function clearStaleShoots () {
    state.staleShoots = {}
  }

  function openSubscription (options) {
    state.subscriptionState = constants.OPENING
    state.subscriptionError = null
    socketStore.emitSubscribe(options)
  }

  function closeSubscription () {
    state.subscriptionState = constants.CLOSING
    state.subscriptionError = null
    state.subscription = null
    socketStore.emitUnsubscribe()
  }

  function handleEvent (event) {
    const notOnlyShootsWithIssues = !onlyAllShootsWithIssues(state, context)
    let setFilteredItemsRequired = false
    switch (event.type) {
      case 'ADDED':
      case 'MODIFIED':
        // Do not add healthy shoots when onlyShootsWithIssues=true, this can happen when toggeling flag
        if (notOnlyShootsWithIssues || shootHasIssue(event.object)) {
          putItem(state, event.object)
          setFilteredItemsRequired = true
        }
        break
      case 'DELETED':
        deleteItem(state, event.object)
        setFilteredItemsRequired = true
        break
      default:
        logger.error('undhandled event type', event.type)
    }
    if (setFilteredItemsRequired) {
      state.filteredShoots = getFilteredItems(state, context)
    }
  }

  return {
    // state
    newShootResource,
    initialNewShootResource,
    shootListFilters,
    subscriptionState,
    subscriptionError,
    focusMode,
    sortBy,
    // getters
    shootList,
    selectedShoot,
    selectedItem: selectedShoot, // TODO: deprecated - use selectedShoot
    onlyShootsWithIssues,
    loading,
    subscribed,
    unsubscribed,
    subscription,
    numberOfNewItemsSinceFreeze,
    // actions
    clear,
    clearStaleShoots,
    synchronize,
    subscribe,
    unsubscribe,
    handleEvent,
    createShoot,
    deleteShoot,
    fetchInfo,
    setSelection,
    setShootListFilters,
    setShootListFilter,
    setNewShootResource,
    resetNewShootResource,
    setFocusMode,
    shootByNamespaceAndName,
    searchItems,
    sortItems,
    setSortBy,
    setSubscription,
    setSubscriptionState,
    setSubscriptionError,
  }
})
