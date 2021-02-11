//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import Vue from 'vue'
import assign from 'lodash/assign'
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
import store from '../../'
import getters from './getters'
import { keyForShoot, findItem } from './helper'
import { getShootInfo, getShootSeedInfo, createShoot, deleteShoot } from '@/utils/api'
import { getSpecTemplate, getDefaultZonesNetworkConfiguration, getControlPlaneZone } from '@/utils/createShoot'
import { isNotFound } from '@/utils/error'
import {
  isReconciliationDeactivated,
  isStatusProgressing,
  shootHasIssue,
  purposesForSecret,
  shortRandomString,
  shootAddonList,
  generateWorker
} from '@/utils'
import { isUserError, errorCodesFromArray } from '@/utils/errorCodes'
import { randomMaintenanceBegin, getMaintenanceWindow, getTimezone } from '@/utils/time'
import find from 'lodash/find'

const uriPattern = /^([^:/?#]+:)?(\/\/[^/?#]*)?([^?#]*)(\?[^#]*)?(#.*)?/

// initial state
const state = {
  shoots: {},
  filteredShoots: [],
  selection: undefined,
  shootListFilters: undefined,
  newShootResource: undefined,
  initialNewShootResource: undefined
}

// actions
const actions = {
  /**
   * Return all shoots in the given namespace.
   * This ends always in a server/backend call.
   */
  clearAll ({ commit, dispatch }) {
    commit('CLEAR_ALL')
    return getters.items
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
        info.grafanaUrlUsers = `https://gu-${baseHost}`
        info.grafanaUrlOperators = `https://go-${baseHost}`

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
  async getSeedInfo ({ commit, rootState }, { name, namespace }) {
    try {
      const { data: info } = await getShootSeedInfo({ namespace, name })
      commit('RECEIVE_SEED_INFO', { name, namespace, info })
      return info
    } catch (error) {
      // shoot seed info not found -> ignore if KubernetesError
      if (isNotFound(error)) {
        return
      }
      throw error
    }
  },
  setSelection ({ commit, dispatch }, metadata) {
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
  setShootListFilters ({ commit, rootState }, value) {
    commit('SET_SHOOT_LIST_FILTERS', { rootState, value })
    return state.shootListFilters
  },
  setShootListFilter ({ commit, rootState }, filterValue) {
    if (state.shootListFilters) {
      commit('SET_SHOOT_LIST_FILTER', { rootState, filterValue })
      return state.shootListFilters
    }
  },
  setNewShootResource ({ commit }, data) {
    commit('SET_NEW_SHOOT_RESOURCE', { data })

    return state.newShootResource
  },
  resetNewShootResource ({ commit, rootState, rootGetters }) {
    const shootResource = {
      apiVersion: 'core.gardener.cloud/v1beta1',
      kind: 'Shoot',
      metadata: {
        namespace: rootState.namespace
      }
    }

    const infrastructureKind = head(rootGetters.sortedCloudProviderKindList)
    set(shootResource, 'spec', getSpecTemplate(infrastructureKind))

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
    const firewallSizes = map(rootGetters.firewallSizesByCloudProfileNameAndRegionAndZones({ cloudProfileName, region, zones: [partitionID] }), 'name')
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

    const allZones = rootGetters.zonesByCloudProfileNameAndRegion({ cloudProfileName, region })
    const zones = allZones.length ? [sample(allZones)] : undefined
    const zonesNetworkConfiguration = getDefaultZonesNetworkConfiguration(zones, infrastructureKind, allZones.length)
    if (zonesNetworkConfiguration) {
      set(shootResource, 'spec.provider.infrastructureConfig.networks.zones', zonesNetworkConfiguration)
    }

    const worker = omit(generateWorker(zones, cloudProfileName, region), ['id', 'isNew'])
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

    const { begin, end } = getMaintenanceWindow(randomMaintenanceBegin(), getTimezone())
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
  }
}

function shoots (state) {
  return map(Object.keys(state.shoots), (key) => state.shoots[key])
}

function setFilteredItems (state, rootState) {
  let items = shoots(state)
  if (rootState.namespace === '_all' && get(state, 'shootListFilters.onlyShootsWithIssues', true)) {
    if (get(state, 'shootListFilters.progressing', false)) {
      const predicate = item => {
        return !isStatusProgressing(get(item, 'metadata', {}))
      }
      items = filter(items, predicate)
    }
    if (get(state, 'shootListFilters.userIssues', false)) {
      const predicate = item => {
        const lastErrors = get(item, 'status.lastErrors', [])
        const allLastErrorCodes = errorCodesFromArray(lastErrors)
        const conditions = get(item, 'status.conditions', [])
        const allConditionCodes = errorCodesFromArray(conditions)
        return !isUserError(allLastErrorCodes) && !isUserError(allConditionCodes)
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

        const ticketsForCluster = store.getters.ticketsByNamespaceAndName(get(item, 'metadata', {}))
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

  state.filteredShoots = items
}

const putItem = (state, newItem) => {
  const item = findItem(state)(newItem.metadata)
  if (item !== undefined) {
    if (item.metadata.resourceVersion !== newItem.metadata.resourceVersion) {
      Vue.set(state.shoots, keyForShoot(item.metadata), assign(item, newItem))
    }
  } else {
    newItem.info = undefined // register property to ensure reactivity
    Vue.set(state.shoots, keyForShoot(newItem.metadata), newItem)
  }
}

const deleteItem = (state, deletedItem) => {
  const item = findItem(state)(deletedItem.metadata)
  if (item !== undefined) {
    Vue.delete(state.shoots, keyForShoot(item.metadata))
  }
}

// mutations
const mutations = {
  RECEIVE_INFO (state, { namespace, name, info }) {
    const item = findItem(state)({ namespace, name })
    if (item !== undefined) {
      Vue.set(item, 'info', info)
    }
  },
  RECEIVE_SEED_INFO (state, { namespace, name, info }) {
    const item = findItem(state)({ namespace, name })
    if (item !== undefined) {
      Vue.set(item, 'seedInfo', info)
    }
  },
  SET_SELECTION (state, metadata) {
    state.selection = metadata
  },
  ITEM_PUT (state, { newItem, rootState }) {
    putItem(state, newItem)
  },
  HANDLE_EVENTS (state, { rootState, events }) {
    const onlyShootsWithIssues = get(state, 'shootListFilters.onlyShootsWithIssues', true)
    let setFilteredItemsRequired = false
    forEach(events, event => {
      switch (event.type) {
        case 'ADDED':
        case 'MODIFIED':
          if (rootState.namespace !== '_all' ||
            !onlyShootsWithIssues ||
            onlyShootsWithIssues === shootHasIssue(event.object)) {
            // Do not add healthy shoots when onlyShootsWithIssues=true, this can happen when toggeling flag
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
    })
    if (setFilteredItemsRequired) {
      setFilteredItems(state, rootState)
    }
  },
  CLEAR_ALL (state) {
    state.shoots = {}
    state.filteredShoots = []
  },
  SET_SHOOT_LIST_FILTERS (state, { rootState, value }) {
    state.shootListFilters = value
    setFilteredItems(state, rootState)
  },
  SET_SHOOT_LIST_FILTER (state, { rootState, filterValue }) {
    const { filter, value } = filterValue
    state.shootListFilters[filter] = value
    setFilteredItems(state, rootState)
  },
  SET_NEW_SHOOT_RESOURCE (state, { data }) {
    state.newShootResource = data
  },
  RESET_NEW_SHOOT_RESOURCE (state, shootResource) {
    state.newShootResource = shootResource
    state.initialNewShootResource = cloneDeep(shootResource)
  }
}

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations
}
