//
// Copyright (c) 2019 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

import Vue from 'vue'
import assign from 'lodash/assign'
import forEach from 'lodash/forEach'
import pick from 'lodash/pick'
import map from 'lodash/map'
import get from 'lodash/get'
import replace from 'lodash/replace'
import transform from 'lodash/transform'
import isEqual from 'lodash/isEqual'
import isObject from 'lodash/isObject'
import orderBy from 'lodash/orderBy'
import toLower from 'lodash/toLower'
import padStart from 'lodash/padStart'
import filter from 'lodash/filter'
import includes from 'lodash/includes'
import split from 'lodash/split'
import join from 'lodash/join'
import set from 'lodash/set'
import head from 'lodash/head'
import sample from 'lodash/sample'
import isEmpty from 'lodash/isEmpty'
import semver from 'semver'
import store from '../'
import { getShoot, getShootInfo, createShoot, deleteShoot } from '@/utils/api'
import { getCloudProviderTemplate } from '@/utils/createShoot'
import { isNotFound } from '@/utils/error'
import { isHibernated,
  getCloudProviderKind,
  isUserError,
  isReconciliationDeactivated,
  isStatusProgressing,
  getCreatedBy,
  getProjectName,
  shootHasIssue,
  purposesForSecret,
  shortRandomString,
  shootAddonList,
  utcMaintenanceWindowFromLocalBegin,
  randomLocalMaintenanceBegin } from '@/utils'

const uriPattern = /^([^:/?#]+:)?(\/\/[^/?#]*)?([^?#]*)(\?[^#]*)?(#.*)?/

const keyForShoot = ({ name, namespace }) => {
  return `${name}_${namespace}`
}

const findItem = ({ name, namespace }) => {
  return state.shoots[keyForShoot({ name, namespace })]
}

// initial state
const state = {
  shoots: {},
  sortedShoots: [],
  filteredAndSortedShoots: [],
  sortParams: undefined,
  searchValue: undefined,
  selection: undefined,
  shootListFilters: undefined,
  newShootResource: undefined,
  initialNewShootResource: undefined
}

// getters
const getters = {
  sortedItems () {
    return state.filteredAndSortedShoots
  },
  itemByNameAndNamespace () {
    return ({ namespace, name }) => {
      return findItem({ name, namespace })
    }
  },
  selectedItem () {
    if (state.selection) {
      return findItem(state.selection)
    }
  },
  getShootListFilters () {
    return state.shootListFilters
  },
  newShootResource () {
    return state.newShootResource
  },
  initialNewShootResource () {
    return state.initialNewShootResource
  }
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
  get ({ dispatch, commit, rootState }, { name, namespace }) {
    const getShootIfNecessary = new Promise(async (resolve, reject) => {
      if (!findItem({ name, namespace })) {
        getShoot({ namespace, name })
          .then(res => {
            const item = res.data
            commit('ITEM_PUT', { newItem: item, rootState })
          }).then(() => resolve())
          .catch(error => reject(error))
      } else {
        resolve()
      }
    })
    return getShootIfNecessary
      .then(() => dispatch('getInfo', { name, namespace }))
      .then(() => findItem({ name, namespace }))
      .catch(error => {
        // shoot info not found -> ignore if KubernetesError
        if (isNotFound(error)) {
          return
        }
        throw error
      })
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
  getInfo ({ commit, rootState }, { name, namespace }) {
    return getShootInfo({ namespace, name })
      .then(res => res.data)
      .then(info => {
        if (info.serverUrl) {
          const [, scheme, host] = uriPattern.exec(info.serverUrl)
          const authority = `//${replace(host, /^\/\//, '')}`
          const pathname = get(rootState.cfg, 'dashboardUrl.pathname')
          info.dashboardUrl = [scheme, authority, pathname].join('')
          info.dashboardUrlText = [scheme, host].join('')
        }

        if (info.seedShootIngressDomain) {
          const baseHost = info.seedShootIngressDomain
          info.grafanaUrlUsers = `https://g-users.${baseHost}`
          info.grafanaUrlOperators = `https://g-operators.${baseHost}`

          info.prometheusUrl = `https://p.${baseHost}`

          info.alertmanagerUrl = `https://a.${baseHost}`

          info.kibanaUrl = `https://k.${baseHost}`
        }
        return info
      })
      .then(info => {
        commit('RECEIVE_INFO', { name, namespace, info })
        return info
      })
      .catch(error => {
        // shoot info not found -> ignore if KubernetesError
        if (isNotFound(error)) {
          return
        }
        throw error
      })
  },
  setSelection ({ commit, dispatch }, metadata) {
    if (!metadata) {
      return commit('SET_SELECTION', null)
    }
    const item = findItem(metadata)
    if (item) {
      commit('SET_SELECTION', pick(metadata, ['namespace', 'name']))
      if (!item.info) {
        return dispatch('getInfo', { name: metadata.name, namespace: metadata.namespace })
      }
    }
  },
  setListSortParams ({ commit, rootState }, pagination) {
    const sortParams = pick(pagination, ['sortBy', 'descending'])
    if (!isEqual(sortParams, state.sortParams)) {
      commit('SET_SORTPARAMS', { rootState, sortParams })
    }
  },
  setListSearchValue ({ commit, rootState }, searchValue) {
    if (!isEqual(searchValue, state.searchValue)) {
      commit('SET_SEARCHVALUE', { rootState, searchValue })
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
  resetNewShootResource ({ commit, rootState }) {
    commit('RESET_NEW_SHOOT_RESOURCE')

    return state.newShootResource
  }
}

// Deep diff between two object, using lodash
const difference = (object, base) => {
  function changes (object, base) {
    return transform(object, function (result, value, key) {
      if (!isEqual(value, base[key])) {
        result[key] = (isObject(value) && isObject(base[key])) ? changes(value, base[key]) : value
      }
    })
  }
  return changes(object, base)
}

const getRawVal = (item, column) => {
  const metadata = item.metadata
  const spec = item.spec
  switch (column) {
    case 'purpose':
      return get(metadata, ['annotations', 'garden.sapcloud.io/purpose'])
    case 'lastOperation':
      return get(item, 'status.lastOperation')
    case 'createdAt':
      return metadata.creationTimestamp
    case 'createdBy':
      return getCreatedBy(metadata)
    case 'project':
      return getProjectName(metadata)
    case 'k8sVersion':
      return get(spec, 'kubernetes.version')
    case 'infrastructure':
      return `${getCloudProviderKind(spec.cloud)} ${get(spec, 'cloud.region')}`
    case 'seed':
      return get(spec, 'cloud.seed')
    case 'journalLabels':
      const labels = store.getters.journalsLabels(metadata)
      return join(map(labels, 'name'), ' ')
    default:
      return metadata[column]
  }
}

const getSortVal = (item, sortBy) => {
  const value = getRawVal(item, sortBy)
  const spec = item.spec
  const status = item.status
  switch (sortBy) {
    case 'purpose':
      switch (value) {
        case 'infrastructure':
          return 0
        case 'production':
          return 1
        case 'development':
          return 2
        case 'evaluation':
          return 3
        default:
          return 4
      }
    case 'lastOperation':
      const operation = value || {}
      const inProgress = operation.progress !== 100 && operation.state !== 'Failed' && !!operation.progress
      const isError = operation.state === 'Failed' || get(item, 'status.lastError')
      const userError = isUserError(get(item, 'status.lastError.codes', []))
      const ignoredFromReconciliation = isReconciliationDeactivated(get(item, 'metadata', {}))

      if (ignoredFromReconciliation) {
        if (isError) {
          return 400
        } else {
          return 450
        }
      } else if (userError && !inProgress) {
        return 200
      } else if (userError && inProgress) {
        const progress = padStart(operation.progress, 2, '0')
        return `3${progress}`
      } else if (isError && !inProgress) {
        return 0
      } else if (isError && inProgress) {
        const progress = padStart(operation.progress, 2, '0')
        return `1${progress}`
      } else if (inProgress) {
        const progress = padStart(operation.progress, 2, '0')
        return `6${progress}`
      } else if (isHibernated(spec)) {
        return 500
      }
      return 700
    case 'readiness':
      const errorConditions = filter(get(status, 'conditions'), condition => get(condition, 'status') !== 'True')
      const lastErrorTransitionTime = head(orderBy(map(errorConditions, 'lastTransitionTime')))
      return lastErrorTransitionTime
    default:
      return toLower(value)
  }
}

const shoots = (state) => {
  return map(Object.keys(state.shoots), (key) => state.shoots[key])
}

const setSortedItems = (state, rootState) => {
  const sortBy = get(state, 'sortParams.sortBy')
  const descending = get(state, 'sortParams.descending', false) ? 'desc' : 'asc'
  if (sortBy) {
    const sortbyNameAsc = (a, b) => {
      if (getRawVal(a, 'name') > getRawVal(b, 'name')) {
        return 1
      } else if (getRawVal(a, 'name') < getRawVal(b, 'name')) {
        return -1
      }
      return 0
    }
    const inverse = descending === 'desc' ? -1 : 1
    if (sortBy === 'k8sVersion') {
      const sortedShoots = shoots(state)
      sortedShoots.sort((a, b) => {
        const versionA = getRawVal(a, sortBy)
        const versionB = getRawVal(b, sortBy)

        if (semver.gt(versionA, versionB)) {
          return 1 * inverse
        } else if (semver.lt(versionA, versionB)) {
          return -1 * inverse
        } else {
          return sortbyNameAsc(a, b)
        }
      })
      state.sortedShoots = sortedShoots
    } else if (sortBy === 'readiness') {
      const sortedShoots = shoots(state)
      sortedShoots.sort((a, b) => {
        const readinessA = getSortVal(a, sortBy)
        const readinessB = getSortVal(b, sortBy)

        if (readinessA === readinessB) {
          return sortbyNameAsc(a, b)
        } else if (!readinessA) {
          return 1
        } else if (!readinessB) {
          return -1
        } else if (readinessA > readinessB) {
          return 1 * inverse
        } else {
          return -1 * inverse
        }
      })
      state.sortedShoots = sortedShoots
    } else {
      state.sortedShoots = orderBy(shoots(state), [item => getSortVal(item, sortBy), 'metadata.name'], [descending, 'asc'])
    }
  } else {
    state.sortedShoots = shoots(state)
  }
  setFilteredAndSortedItems(state, rootState)
}

const setFilteredAndSortedItems = (state, rootState) => {
  let items = state.sortedShoots
  if (state.searchValue) {
    const predicate = item => {
      let found = true
      forEach(state.searchValue, value => {
        if (includes(getRawVal(item, 'name'), value)) {
          return
        }
        if (includes(getRawVal(item, 'infrastructure'), value)) {
          return
        }
        if (includes(getRawVal(item, 'seed'), value)) {
          return
        }
        if (includes(getRawVal(item, 'project'), value)) {
          return
        }
        if (includes(getRawVal(item, 'createdBy'), value)) {
          return
        }
        if (includes(getRawVal(item, 'purpose'), value)) {
          return
        }
        if (includes(getRawVal(item, 'k8sVersion'), value)) {
          return
        }
        if (includes(getRawVal(item, 'journalLabels'), value)) {
          return
        }
        found = false
      })
      return found
    }
    items = filter(items, predicate)
  }
  if (rootState.namespace === '_all' && rootState.onlyShootsWithIssues) {
    if (get(state, 'shootListFilters.progressing', false)) {
      const predicate = item => {
        return !isStatusProgressing(get(item, 'metadata', {}))
      }
      items = filter(items, predicate)
    }
    if (get(state, 'shootListFilters.userIssues', false)) {
      const predicate = item => {
        return !isUserError(get(item, 'status.lastError.codes', []))
      }
      items = filter(items, predicate)
    }
    if (get(state, 'shootListFilters.deactivatedReconciliation', false)) {
      const predicate = item => {
        return !isReconciliationDeactivated(get(item, 'metadata', {}))
      }
      items = filter(items, predicate)
    }
    if (get(state, 'shootListFilters.hasJournals', false)) {
      const predicate = item => {
        return !(store.getters['journals/lastUpdated'](get(item, 'metadata', {})) !== undefined)
      }
      items = filter(items, predicate)
    }
  }

  state.filteredAndSortedShoots = items
}

const putItem = (state, newItem) => {
  const item = findItem(newItem.metadata)
  if (item !== undefined) {
    if (item.metadata.resourceVersion !== newItem.metadata.resourceVersion) {
      const sortBy = get(state, 'sortParams.sortBy')
      let sortRequired = true
      if (sortBy === 'name' || sortBy === 'infrastructure' || sortBy === 'project' || sortBy === 'createdAt' || sortBy === 'createdBy') {
        sortRequired = false // these values cannot change
      } else if (sortBy !== 'lastOperation') { // don't check in this case as most put events will be lastOperation anyway
        const changes = difference(item, newItem)
        const sortBy = get(state, 'sortParams.sortBy')
        if (!getRawVal(changes, sortBy)) {
          sortRequired = false
        }
      }
      Vue.set(state.shoots, keyForShoot(item.metadata), assign(item, newItem))
      return sortRequired
    }
  } else {
    newItem.info = undefined // register property to ensure reactivity
    Vue.set(state.shoots, keyForShoot(newItem.metadata), newItem)
    return true
  }
}

const deleteItem = (state, deletedItem) => {
  const item = findItem(deletedItem.metadata)
  let sortRequired = false
  if (item !== undefined) {
    Vue.delete(state.shoots, keyForShoot(item.metadata))
    sortRequired = true
  }
  return sortRequired
}

// mutations
const mutations = {
  RECEIVE_INFO (state, { namespace, name, info }) {
    const item = findItem({ namespace, name })
    if (item !== undefined) {
      Vue.set(item, 'info', info)
    }
  },
  SET_SELECTION (state, metadata) {
    state.selection = metadata
  },
  SET_SORTPARAMS (state, { rootState, sortParams }) {
    state.sortParams = sortParams
    setSortedItems(state, rootState)
  },
  SET_SEARCHVALUE (state, { rootState, searchValue }) {
    if (searchValue && searchValue.length > 0) {
      state.searchValue = split(searchValue, ' ')
    } else {
      state.searchValue = undefined
    }
    setFilteredAndSortedItems(state, rootState)
  },
  ITEM_PUT (state, { newItem, rootState }) {
    const sortRequired = putItem(state, newItem)

    if (sortRequired) {
      setSortedItems(state, rootState)
    }
  },
  HANDLE_EVENTS (state, { rootState, events }) {
    let sortRequired = false
    forEach(events, event => {
      switch (event.type) {
        case 'ADDED':
        case 'MODIFIED':
          if (rootState.namespace !== '_all' ||
            !rootState.onlyShootsWithIssues ||
            rootState.onlyShootsWithIssues === shootHasIssue(event.object)) {
            // Do not add healthy shoots when onlyShootsWithIssues=true, this can happen when toggeling flag
            if (putItem(state, event.object)) {
              sortRequired = true
            }
          }
          break
        case 'DELETED':
          if (deleteItem(state, event.object)) {
            sortRequired = true
          }
          break
        default:
          console.error('undhandled event type', event.type)
      }
    })
    if (sortRequired) {
      setSortedItems(state, rootState)
    }
  },
  CLEAR_ALL (state) {
    state.shoots = {}
    state.sortedShoots = []
    state.filteredAndSortedShoots = []
  },
  SET_SHOOT_LIST_FILTERS (state, { rootState, value }) {
    state.shootListFilters = value
    setFilteredAndSortedItems(state, rootState)
  },
  SET_SHOOT_LIST_FILTER (state, { rootState, filterValue }) {
    const { filter, value } = filterValue
    state.shootListFilters[filter] = value
    setFilteredAndSortedItems(state, rootState)
  },
  SET_NEW_SHOOT_RESOURCE (state, { data }) {
    state.newShootResource = data
  },
  RESET_NEW_SHOOT_RESOURCE (state) {
    const shootResource = {
      apiVersion: 'garden.sapcloud.io/v1beta1',
      kind: 'Shoot'
    }

    const infrastructureKind = head(store.getters.sortedCloudProviderKindList)
    set(shootResource, ['spec', 'cloud', infrastructureKind], getCloudProviderTemplate(infrastructureKind))

    const cloudProfileName = get(head(store.getters.cloudProfilesByCloudProviderKind(infrastructureKind)), 'metadata.name')
    set(shootResource, 'spec.cloud.profile', cloudProfileName)

    const secret = head(store.getters.infrastructureSecretsByCloudProfileName(cloudProfileName))
    const secretBindingRef = {
      name: get(secret, 'metadata.bindingName')
    }
    set(shootResource, 'spec.cloud.secretBindingRef', secretBindingRef)

    const region = head(store.getters.regionsWithSeedByCloudProfileName(cloudProfileName))
    set(shootResource, 'spec.cloud.region', region)

    const zones = [sample(store.getters.zonesByCloudProfileNameAndRegion({ cloudProfileName, region }))]
    if (!isEmpty(zones)) {
      set(shootResource, ['spec', 'cloud', infrastructureKind, 'zones'], zones)
    }

    const loadBalancerProviderName = head(store.getters.loadBalancerProviderNamesByCloudProfileName(cloudProfileName))
    if (!isEmpty(loadBalancerProviderName)) {
      set(shootResource, ['spec', 'cloud', infrastructureKind, 'loadBalancerProvider'], loadBalancerProviderName)
    }
    const floatingPoolName = head(store.getters.floatingPoolNamesByCloudProfileName(cloudProfileName))
    if (!isEmpty(floatingPoolName)) {
      set(shootResource, ['spec', 'cloud', infrastructureKind, 'floatingPoolName'], floatingPoolName)
    }

    const name = shortRandomString(10)
    set(shootResource, 'metadata.name', name)

    const purpose = head(purposesForSecret(secret))
    set(shootResource, 'metadata.annotations["garden.sapcloud.io/purpose"]', purpose)

    const kubernetesVersion = head(store.getters.sortedKubernetesVersions(cloudProfileName))
    set(shootResource, 'spec.kubernetes.version', kubernetesVersion)

    const workerName = `worker-${shortRandomString(5)}`
    const volumeType = get(head(store.getters.volumeTypesByCloudProfileNameAndZones({ cloudProfileName, zones })), 'name')
    const volumeSize = volumeType ? '50Gi' : undefined
    const machineType = get(head(store.getters.machineTypesByCloudProfileNameAndZones({ cloudProfileName, zones })), 'name')
    const machineImage = store.getters.defaultMachineImageForCloudProfileName(cloudProfileName)
    const workers = [
      {
        name: workerName,
        machineType,
        volumeType,
        volumeSize,
        autoScalerMin: 1,
        autoScalerMax: 2,
        maxSurge: 1,
        machineImage
      }
    ]
    set(shootResource, ['spec', 'cloud', infrastructureKind, 'workers'], workers)

    const addons = {}
    forEach(filter(shootAddonList, addon => addon.visible), addon => {
      set(addons, [addon.name, 'enabled'], addon.enabled)
    })
    set(shootResource, 'spec.addons', addons)

    const { utcBegin, utcEnd } = utcMaintenanceWindowFromLocalBegin({ localBegin: randomLocalMaintenanceBegin(), timezone: store.state.localTimezone })
    const maintenance = {
      timeWindow: {
        begin: utcBegin,
        end: utcEnd
      },
      autoUpdate: {
        kubernetesVersion: true,
        machineImageVersion: true
      }
    }
    set(shootResource, 'spec.maintenance', maintenance)

    let hibernationSchedule = get(store.state.cfg.defaultHibernationSchedule, purpose)
    hibernationSchedule = map(hibernationSchedule, schedule => {
      schedule.location = store.state.localTimezone
      return schedule
    })
    set(shootResource, 'spec.hibernation.schedule', hibernationSchedule)

    state.newShootResource = shootResource
    state.initialNewShootResource = { ...shootResource }
  }
}

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations
}
