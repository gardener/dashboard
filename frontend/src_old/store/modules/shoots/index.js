//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import Vue from 'vue'
import forEach from 'lodash/forEach'
import pick from 'lodash/pick'
import omit from 'lodash/omit'
import map from 'lodash/map'
import get from 'lodash/get'
import replace from 'lodash/replace'
import filter from 'lodash/filter'
import includes from 'lodash/includes'
import some from 'lodash/some'
import set from 'lodash/set'
import head from 'lodash/head'
import sample from 'lodash/sample'
import isEmpty from 'lodash/isEmpty'
import cloneDeep from 'lodash/cloneDeep'
import find from 'lodash/find'
import difference from 'lodash/difference'
import getters from './getters'
import { keyForShoot, findItem, constants, putItem, deleteItem } from './helper'
import {
  getShoots,
  getShoot,
  getIssues,
  getIssuesAndComments,
  getShootInfo,
  createShoot,
  deleteShoot
} from '@/utils/api'
import { getSpecTemplate, getDefaultZonesNetworkConfiguration, getControlPlaneZone } from '@/utils/createShoot'
import { isNotFound } from '@/utils/error'
import {
  isReconciliationDeactivated,
  isStatusProgressing,
  shootHasIssue,
  purposesForSecret,
  shortRandomString,
  shootAddonList,
  randomMaintenanceBegin,
  maintenanceWindowWithBeginAndTimezone,
  isTruthyValue
} from '@/utils'
import { globalLogger } from '@/utils/logger'
import { isUserError, isTemporaryError, errorCodesFromArray } from '@/utils/errorCodes'

const uriPattern = /^([^:/?#]+:)?(\/\/[^/?#]*)?([^?#]*)(\?[^#]*)?(#.*)?/
// FIXME: Previously the logger was accessed through the global Vue.logger which was defined inside
//   plugins. With Vue3 everything should be registered on the app instance.
//   This was a simple fix but it should be checked if this is the actual "vue 3 way" of doing it.
//   Also see the comment in src/utils/logger.js.
const logger = globalLogger

// initial state
const state = {
  shoots: {},
  staleShoots: {}, // shoots will be moved here when they are removed in case focus mode is active
  sortedUidsAtFreeze: [],
  filteredShoots: [], // TODO fill
  selection: undefined,
  shootListFilters: undefined,
  newShootResource: undefined,
  initialNewShootResource: undefined,
  focusMode: false,
  subscription: null,
  subscriptionState: constants.CLOSED,
  subscriptionError: null,
  sortBy: undefined,
  sortDesc: undefined
}

function clearAll ({ commit }) {
  commit('CLEAR_ALL')
  commit('tickets/CLEAR_ISSUES', undefined, { root: true })
  commit('tickets/CLEAR_COMMENTS', undefined, { root: true })
}

// actions
const actions = {
  unsubscribe ({ commit, dispatch }) {
    commit('UNSUBSCRIBE')
    clearAll({ commit })
  },
  clear ({ commit }) {
    commit('CLEAR_ALL')
    commit('tickets/CLEAR_ISSUES', undefined, { root: true })
    commit('tickets/CLEAR_COMMENTS', undefined, { root: true })
  },
  subscribe ({ commit, dispatch, rootState }, metadata = {}) {
    const { namespace = rootState.namespace, name } = metadata
    commit('SET_SUBSCRIPTION', { namespace, name })
    return dispatch('synchronize')
  },
  synchronize ({ commit, dispatch, getters, rootState, rootGetters }) {
    const fetchShoot = async options => {
      const [
        { data: shoot },
        { data: { issues = [], comments = [] } }
      ] = await Promise.all([
        getShoot(options),
        getIssuesAndComments(options)
      ])
      // fetch shootInfo in the background (do not await the promise)
      assignInfo(shoot)
      logger.debug('Fetched shoot and tickets for %s in namespace %s', options.name, options.namespace)
      return { shoots: [shoot], issues, comments }
    }

    const fetchShoots = async options => {
      const { namespace } = options
      const [
        { data: { items } },
        { data: { issues = [] } }
      ] = await Promise.all([
        getShoots(options),
        getIssues({ namespace })
      ])
      logger.debug('Fetched shoots and tickets in namespace %s', options.namespace)
      return { shoots: items, issues, comments: [] }
    }

    const assignInfo = async ({ metadata, spec }) => {
      try {
        await dispatch('getInfo', metadata)
      } catch (err) {
        logger.error('Failed to fetch shoot info:', err.message)
      }
    }

    // await and handle response data in the background
    const fetchData = async options => {
      try {
        commit('SET_SUBSCRIPTION_STATE', constants.LOADING)
        const promise = options.name
          ? fetchShoot(options)
          : fetchShoots(options)
        const { shoots, issues, comments } = await promise
        commit('RECEIVE', { rootState, rootGetters, shoots })
        commit('tickets/RECEIVE_ISSUES', issues, { root: true })
        commit('tickets/RECEIVE_COMMENTS', comments, { root: true })
        commit('SUBSCRIBE', options)
      } catch (err) {
        const message = get(err, 'response.data.message', err.message)
        logger.error('Failed to fetch shoots or tickets: %s', message)
        commit('SET_SUBSCRIPTION_ERROR', err)
        clearAll({ commit })
        throw err
      }
    }

    const options = getters.subscription
    if (options) {
      return fetchData(options)
    }
  },
  create ({ dispatch, commit, rootState }, data) {
    const namespace = data.metadata.namespace || rootState.namespace
    return createShoot({ namespace, data })
  },
  delete ({ dispatch, commit, rootState }, { name, namespace }) {
    return deleteShoot({ namespace, name })
  },
  /**
   * Return the given info for a single shoot with the namespace/name.
   * This ends always in a server/backend call.
   */
  async getInfo ({ commit, rootState }, { name, namespace }) {
    try {
      const { data: info } = await getShootInfo({ namespace, name })
      if (info.serverUrl) {
        const [, scheme, host] = uriPattern.exec(info.serverUrl)
        const authority = `//${replace(host, /^\/\//, '')}`
        const pathname = info.dashboardUrlPath
        info.dashboardUrl = [scheme, authority, pathname].join('')
        info.dashboardUrlText = [scheme, host].join('')
      }

      if (info.seedShootIngressDomain) {
        const baseHost = info.seedShootIngressDomain
        info.grafanaUrl = `https://gu-${baseHost}`

        info.prometheusUrl = `https://p-${baseHost}`

        info.alertmanagerUrl = `https://au-${baseHost}`
      }
      commit('RECEIVE_INFO', { name, namespace, info })
      return info
    } catch (error) {
      // shoot info not found -> ignore if KubernetesError
      if (isNotFound(error)) {
        return
      }
      throw error
    }
  },
  setSelection ({ commit, dispatch, state }, metadata) {
    if (!metadata) {
      return commit('SET_SELECTION', null)
    }
    const item = findItem(state)(metadata)
    if (item) {
      commit('SET_SELECTION', pick(metadata, ['namespace', 'name']))
      if (!item.info) {
        return dispatch('getInfo', { name: metadata.name, namespace: metadata.namespace })
      }
    }
  },
  setShootListFilters ({ commit, state, rootState, rootGetters }, value) {
    commit('SET_SHOOT_LIST_FILTERS', { rootState, rootGetters, value })
    return state.shootListFilters
  },
  setShootListFilter ({ commit, state, rootState, rootGetters }, filterValue) {
    if (state.shootListFilters) {
      commit('SET_SHOOT_LIST_FILTER', { rootState, rootGetters, filterValue })
      return state.shootListFilters
    }
  },
  setNewShootResource ({ commit, state }, data) {
    commit('SET_NEW_SHOOT_RESOURCE', { data })

    return state.newShootResource
  },
  resetNewShootResource ({ commit, state, rootState, rootGetters }) {
    const shootResource = {
      apiVersion: 'core.gardener.cloud/v1beta1',
      kind: 'Shoot',
      metadata: {
        namespace: rootState.namespace
      }
    }

    if (!rootGetters.sortedCloudProviderKindList.length) {
      logger.warn('Could not reset new shoot resource as there is no supported cloud profile')
      return
    }

    const infrastructureKind = head(rootGetters.sortedCloudProviderKindList)
    set(shootResource, 'spec', getSpecTemplate(infrastructureKind, rootGetters.nodesCIDR))

    const cloudProfileName = get(head(rootGetters.cloudProfilesByCloudProviderKind(infrastructureKind)), 'metadata.name')
    set(shootResource, 'spec.cloudProfileName', cloudProfileName)

    const secret = head(rootGetters.infrastructureSecretsByCloudProfileName(cloudProfileName))
    set(shootResource, 'spec.secretBindingName', get(secret, 'metadata.name'))

    let region = head(rootGetters.regionsWithSeedByCloudProfileName(cloudProfileName))
    if (!region) {
      const seedDeterminationStrategySameRegion = rootState.cfg.seedCandidateDeterminationStrategy === 'SameRegion'
      if (!seedDeterminationStrategySameRegion) {
        region = head(rootGetters.regionsWithoutSeedByCloudProfileName(cloudProfileName))
      }
    }
    set(shootResource, 'spec.region', region)

    const networkingType = head(rootGetters.networkingTypeList)
    set(shootResource, 'spec.networking.type', networkingType)

    const loadBalancerProviderName = head(rootGetters.loadBalancerProviderNamesByCloudProfileNameAndRegion({ cloudProfileName, region }))
    if (!isEmpty(loadBalancerProviderName)) {
      set(shootResource, 'spec.provider.controlPlaneConfig.loadBalancerProvider', loadBalancerProviderName)
    }
    const secretDomain = get(secret, 'data.domainName')
    const floatingPoolName = head(rootGetters.floatingPoolNamesByCloudProfileNameAndRegionAndDomain({ cloudProfileName, region, secretDomain }))
    if (!isEmpty(floatingPoolName)) {
      set(shootResource, 'spec.provider.infrastructureConfig.floatingPoolName', floatingPoolName)
    }

    const allLoadBalancerClassNames = rootGetters.loadBalancerClassNamesByCloudProfileName(cloudProfileName)
    if (!isEmpty(allLoadBalancerClassNames)) {
      const defaultLoadBalancerClassName = includes(allLoadBalancerClassNames, 'default')
        ? 'default'
        : head(allLoadBalancerClassNames)
      const loadBalancerClasses = [{
        name: defaultLoadBalancerClassName
      }]
      set(shootResource, 'spec.provider.controlPlaneConfig.loadBalancerClasses', loadBalancerClasses)
    }

    const partitionIDs = rootGetters.partitionIDsByCloudProfileNameAndRegion({ cloudProfileName, region })
    const partitionID = head(partitionIDs)
    if (!isEmpty(partitionID)) {
      set(shootResource, 'spec.provider.infrastructureConfig.partitionID', partitionID)
    }
    const firewallImages = rootGetters.firewallImagesByCloudProfileName(cloudProfileName)
    const firewallImage = head(firewallImages)
    if (!isEmpty(firewallImage)) {
      set(shootResource, 'spec.provider.infrastructureConfig.firewall.image', firewallImage)
    }
    const firewallSizes = map(rootGetters.firewallSizesByCloudProfileNameAndRegion({ cloudProfileName, region }), 'name')
    const firewallSize = head(firewallSizes)
    if (!isEmpty(firewallSize)) {
      set(shootResource, 'spec.provider.infrastructureConfig.firewall.size', firewallImage)
    }
    const allFirewallNetworks = rootGetters.firewallNetworksByCloudProfileNameAndPartitionId({ cloudProfileName, partitionID })
    const firewallNetworks = find(allFirewallNetworks, { key: 'internet' })
    if (!isEmpty(firewallNetworks)) {
      set(shootResource, 'spec.provider.infrastructureConfig.firewall.networks', firewallNetworks)
    }

    const name = shortRandomString(10)
    set(shootResource, 'metadata.name', name)

    const purpose = head(purposesForSecret(secret))
    set(shootResource, 'spec.purpose', purpose)

    const kubernetesVersion = rootGetters.defaultKubernetesVersionForCloudProfileName(cloudProfileName) || {}
    set(shootResource, 'spec.kubernetes.version', kubernetesVersion.version)
    set(shootResource, 'spec.kubernetes.enableStaticTokenKubeconfig', false)

    const allZones = rootGetters.zonesByCloudProfileNameAndRegion({ cloudProfileName, region })
    const zones = allZones.length ? [sample(allZones)] : undefined
    const zonesNetworkConfiguration = getDefaultZonesNetworkConfiguration(zones, infrastructureKind, allZones.length, rootGetters.nodesCIDR)
    if (zonesNetworkConfiguration) {
      set(shootResource, 'spec.provider.infrastructureConfig.networks.zones', zonesNetworkConfiguration)
    }

    const newWorker = rootGetters.generateWorker(zones, cloudProfileName, region, kubernetesVersion.version)
    const worker = omit(newWorker, ['id', 'isNew'])
    const workers = [worker]
    set(shootResource, 'spec.provider.workers', workers)

    const controlPlaneZone = getControlPlaneZone(workers, infrastructureKind)
    if (controlPlaneZone) {
      set(shootResource, 'spec.provider.controlPlaneConfig.zone', controlPlaneZone)
    }

    const addons = {}
    forEach(filter(shootAddonList, addon => addon.visible), addon => {
      set(addons, [addon.name, 'enabled'], addon.enabled)
    })

    set(shootResource, 'spec.addons', addons)

    const { begin, end } = maintenanceWindowWithBeginAndTimezone(randomMaintenanceBegin(), rootState.timezone)
    const maintenance = {
      timeWindow: {
        begin,
        end
      },
      autoUpdate: {
        kubernetesVersion: true,
        machineImageVersion: true
      }
    }
    set(shootResource, 'spec.maintenance', maintenance)

    let hibernationSchedule = get(rootState.cfg.defaultHibernationSchedule, purpose)
    hibernationSchedule = map(hibernationSchedule, schedule => {
      return {
        ...schedule,
        location: rootState.location
      }
    })
    set(shootResource, 'spec.hibernation.schedules', hibernationSchedule)

    commit('RESET_NEW_SHOOT_RESOURCE', shootResource)
    return state.newShootResource
  },
  setFocusMode ({ commit, getters }, value) {
    let sortedUids
    if (value) {
      const sortedShoots = getters.sortItems([...state.filteredShoots], state.sortBy, state.sortDesc)
      sortedUids = map(sortedShoots, 'metadata.uid')
    }
    commit('SET_FOCUS_MODE', { value, sortedUids })
  }
}

function onlyAllShootsWithIssues (state, rootState) {
  return rootState.namespace === '_all' && get(state.shootListFilters, 'onlyShootsWithIssues', true)
}

function getFilteredItems (state, rootState, rootGetters) {
  let items = Object.values(state.shoots)
  if (onlyAllShootsWithIssues(state, rootState)) {
    if (get(state, 'shootListFilters.progressing', false)) {
      const predicate = item => {
        return !isStatusProgressing(get(item, 'metadata', {}))
      }
      items = filter(items, predicate)
    }
    if (get(state, 'shootListFilters.noOperatorAction', false)) {
      const predicate = item => {
        const ignoreIssues = isTruthyValue(get(item, ['metadata', 'annotations', 'dashboard.gardener.cloud/ignore-issues']))
        if (ignoreIssues) {
          return false
        }
        const lastErrors = get(item, 'status.lastErrors', [])
        const allLastErrorCodes = errorCodesFromArray(lastErrors)
        if (isTemporaryError(allLastErrorCodes)) {
          return false
        }
        const conditions = get(item, 'status.conditions', [])
        const allConditionCodes = errorCodesFromArray(conditions)

        const constraints = get(item, 'status.constraints', [])
        const allConstraintCodes = errorCodesFromArray(constraints)

        return !(isUserError(allLastErrorCodes) || isUserError(allConditionCodes) || isUserError(allConstraintCodes))
      }
      items = filter(items, predicate)
    }
    if (get(state, 'shootListFilters.deactivatedReconciliation', false)) {
      const predicate = item => {
        return !isReconciliationDeactivated(get(item, 'metadata', {}))
      }
      items = filter(items, predicate)
    }
    if (get(state, 'shootListFilters.hideTicketsWithLabel', false)) {
      const predicate = item => {
        const hideClustersWithLabels = get(rootState.cfg, 'ticket.hideClustersWithLabels')
        if (!hideClustersWithLabels) {
          return true
        }
        const metadata = get(item, 'metadata', {})
        metadata.projectName = rootGetters.projectNameByNamespace(metadata)
        const ticketsForCluster = rootGetters['tickets/issues'](metadata)
        if (!ticketsForCluster.length) {
          return true
        }

        const ticketsWithoutHideLabel = filter(ticketsForCluster, ticket => {
          const labelNames = map(get(ticket, 'data.labels'), 'name')
          const ticketHasHideLabel = some(hideClustersWithLabels, hideClustersWithLabel => includes(labelNames, hideClustersWithLabel))
          return !ticketHasHideLabel
        })
        return ticketsWithoutHideLabel.length > 0
      }
      items = filter(items, predicate)
    }
  }

  return items
}

// mutations
const mutations = {
  RECEIVE (state, { rootState, rootGetters, shoots: items }) {
    const notOnlyShootsWithIssues = !onlyAllShootsWithIssues(state, rootState)

    const shoots = {}
    for (const object of items) {
      if (notOnlyShootsWithIssues || shootHasIssue(object)) {
        shoots[keyForShoot(object.metadata)] = object
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
          Vue.set(state.staleShoots, removedShoot.metadata.uid, { ...removedShoot, stale: true })
        }
      })

      addedShootKeys.forEach(addedShootKey => {
        const addedShoot = shoots[addedShootKey]
        Vue.delete(state.staleShoots, addedShoot.metadata.uid)
      })
    }

    state.shoots = shoots
    state.filteredShoots = getFilteredItems(state, rootState, rootGetters)
  },
  RECEIVE_INFO (state, { namespace, name, info }) {
    const item = findItem(state)({ namespace, name })
    if (item !== undefined) {
      Vue.set(item, 'info', info)
    }
  },
  SET_SELECTION (state, metadata) {
    state.selection = metadata
  },
  ITEM_PUT (state, { newItem }) {
    putItem(state, newItem)
  },
  HANDLE_EVENT (state, { rootState, rootGetters, event }) {
    const notOnlyShootsWithIssues = !onlyAllShootsWithIssues(state, rootState)
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
        console.error('undhandled event type', event.type)
    }
    if (setFilteredItemsRequired) {
      state.filteredShoots = getFilteredItems(state, rootState, rootGetters)
    }
  },
  CLEAR_ALL (state) {
    state.shoots = {}
    state.staleShoots = {}
  },
  CLEAR_FREEZED_STALE_SHOOTS (state) {
    state.staleShoots = {}
  },
  SET_SHOOT_LIST_FILTERS (state, { rootState, rootGetters, value }) {
    state.shootListFilters = value
    state.filteredShoots = getFilteredItems(state, rootState, rootGetters)
  },
  SET_SHOOT_LIST_FILTER (state, { rootState, rootGetters, filterValue }) {
    const { filter, value } = filterValue
    state.shootListFilters[filter] = value
    state.filteredShoots = getFilteredItems(state, rootState, rootGetters)
  },
  SET_NEW_SHOOT_RESOURCE (state, { data }) {
    state.newShootResource = data
  },
  RESET_NEW_SHOOT_RESOURCE (state, shootResource) {
    state.newShootResource = shootResource
    state.initialNewShootResource = cloneDeep(shootResource)
  },
  SET_FOCUS_MODE (state, { value, sortedUids }) {
    state.focusMode = value
    state.sortedUidsAtFreeze = sortedUids
  },
  SET_SUBSCRIPTION (state, value) {
    state.subscription = value
    state.subscriptionState = constants.DEFINED
    state.subscriptionError = null
  },
  SUBSCRIBE (state) {
    state.subscriptionState = constants.OPENING
    state.subscriptionError = null
  },
  UNSUBSCRIBE (state) {
    state.subscriptionState = constants.CLOSING
    state.subscriptionError = null
    state.subscription = null
  },
  SET_SUBSCRIPTION_STATE (state, value) {
    if (Object.values(constants).includes(value)) {
      state.subscriptionState = value
    } else if (Object.keys(constants).includes(value)) {
      state.subscriptionState = constants[value]
    }
  },
  SET_SUBSCRIPTION_ERROR (state, err) {
    if (err) {
      const name = err.name
      const statusCode = get(err, 'response.status', 500)
      const message = get(err, 'response.data.message', err.message)
      const reason = get(err, 'response.data.reason')
      const code = get(err, 'response.data.code', 500)
      state.subscriptionError = { name, statusCode, message, code, reason }
    } else {
      state.subscriptionError = null
    }
  },
  SET_SORT_BY (state, value) {
    state.sortBy = value
  },
  SET_SORT_DESC (state, value) {
    state.sortDesc = value
  }
}

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations
}
