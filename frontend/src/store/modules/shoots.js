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
import head from 'lodash/head'
import semver from 'semver'
import store from '../'
import { getShoot, getShootInfo, createShoot, deleteShoot } from '@/utils/api'
import { isNotFound } from '@/utils/error'
import { isHibernated,
  getCloudProviderKind,
  isUserError,
  isReconciliationDeactivated,
  isStatusProgressing,
  getCreatedBy,
  getProjectName,
  shootHasIssue } from '@/utils'

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
  hideUserIssues: undefined,
  hideProgressingIssues: undefined,
  hideDeactivatedReconciliation: undefined
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
  isHideUserIssues () {
    return state.hideUserIssues
  },
  isHideProgressingIssues () {
    return state.hideProgressingIssues
  },
  isHideDeactivatedReconciliation () {
    return state.hideDeactivatedReconciliation
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
    const user = rootState.user

    const getShootIfNecessary = new Promise(async (resolve, reject) => {
      if (!findItem({ name, namespace })) {
        getShoot({ namespace, name, user })
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
    const user = rootState.user
    return createShoot({ namespace, user, data })
  },
  delete ({ dispatch, commit, rootState }, { name, namespace }) {
    const user = rootState.user
    return deleteShoot({ namespace, name, user })
  },
  /**
   * Return the given info for a single shoot with the namespace/name.
   * This ends always in a server/backend call.
   */
  getInfo ({ commit, rootState }, { name, namespace }) {
    const user = rootState.user
    return getShootInfo({ namespace, name, user })
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
          const grafanaPathname = get(rootState.cfg, 'grafanaUrl.pathname', '')
          const grafanaHost = `g.${info.seedShootIngressDomain}`
          info.grafanaUrl = `https://${grafanaHost}${grafanaPathname}`
          info.grafanaUrlText = `https://${grafanaHost}`

          const prometheusHost = `p.${info.seedShootIngressDomain}`
          info.prometheusUrl = `https://${prometheusHost}`

          const alertmanagerHost = `a.${info.seedShootIngressDomain}`
          info.alertmanagerUrl = `https://${alertmanagerHost}`

          const kibanaHost = `k.${info.seedShootIngressDomain}`
          info.kibanaUrl = `https://${kibanaHost}`
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
  setHideUserIssues ({ commit, rootState }, value) {
    commit('SET_HIDE_USER_ISSUES', { rootState, value })
    return state.hideUserIssues
  },
  setHideProgressingIssues ({ commit, rootState }, value) {
    commit('SET_HIDE_PROGRESSING_ISSUES', { rootState, value })
    return state.hideProgressingIssues
  },
  setHideDeactivatedReconciliation ({ commit, rootState }, value) {
    commit('SET_HIDE_DEACTIVATED_RECONCILIATION', { rootState, value })
    return state.hideDeactivatedReconciliation
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
      return getCloudProviderKind(spec.cloud)
    case 'infrastructure_search':
      return `${get(spec, 'cloud.region')} ${getCloudProviderKind(spec.cloud)}`
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
      const ignoredFromReconciliation = get(item, ['metadata', 'annotations', 'shoot.garden.sapcloud.io/ignore']) === 'true'

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
        if (includes(getRawVal(item, 'infrastructure_search'), value)) {
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
  if (state.hideProgressingIssues && rootState.namespace === '_all' && rootState.onlyShootsWithIssues) {
    const predicate = item => {
      return !isStatusProgressing(get(item, 'metadata', {}))
    }
    items = filter(items, predicate)
  }
  if (state.hideUserIssues && rootState.namespace === '_all' && rootState.onlyShootsWithIssues) {
    const predicate = item => {
      return !isUserError(get(item, 'status.lastError.codes', []))
    }
    items = filter(items, predicate)
  }
  if (state.hideDeactivatedReconciliation && rootState.namespace === '_all' && rootState.onlyShootsWithIssues) {
    const predicate = item => {
      return !isReconciliationDeactivated(get(item, 'metadata', {}))
    }
    items = filter(items, predicate)
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
  SET_HIDE_USER_ISSUES (state, { rootState, value }) {
    state.hideUserIssues = value
    setFilteredAndSortedItems(state, rootState)
  },
  SET_HIDE_PROGRESSING_ISSUES (state, { rootState, value }) {
    state.hideProgressingIssues = value
    setFilteredAndSortedItems(state, rootState)
  },
  SET_HIDE_DEACTIVATED_RECONCILIATION (state, { rootState, value }) {
    state.hideDeactivatedReconciliation = value
    setFilteredAndSortedItems(state, rootState)
  }
}

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations
}
