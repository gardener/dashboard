//
// Copyright (c) 2018 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file
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
import { getShoot, getShootInfo, createShoot, deleteShoot } from '@/utils/api'
import { isNotFound } from '@/utils/error'
import { availableK8sUpdatesForShoot, isHibernated, getCloudProviderKind, isUserError, isReconciliationDeactivated, getCreatedBy } from '@/utils'

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
  sortParams: undefined,
  searchValue: undefined,
  selection: undefined,
  hideUserIssues: undefined,
  hideDeactivatedReconciliation: undefined
}

// getters
const getters = {
  sortedItems () {
    return (rootState) => {
      let items = state.sortedShoots
      if (state.searchValue) {
        const predicate = item => {
          let found = true
          forEach(state.searchValue, value => {
            if (!includes(item.metadata.name, value)) {
              found = false
            }
          })
          return found
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
      return items
    }
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
            commit('ITEM_PUT', item)
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
  setListSortParams ({ commit }, sortParams) {
    if (!isEqual(sortParams, state.sortParams)) {
      commit('SET_SORTPARAMS', pick(sortParams, ['sortBy', 'descending']))
    }
  },
  setListSearchValue ({ commit }, searchValue) {
    if (!isEqual(searchValue, state.searchValue)) {
      commit('SET_SEARCHVALUE', searchValue)
    }
  },
  setHideUserIssues ({ commit }, value) {
    commit('SET_HIDE_USER_ISSUES', value)
    return state.hideUserIssues
  },
  setHideDeactivatedReconciliation ({ commit }, value) {
    commit('SET_HIDE_DEACTIVATED_RECONCILIATION', value)
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

const getRawSortVal = (item, sortBy) => {
  const metadata = item.metadata
  const spec = item.spec
  switch (sortBy) {
    case 'purpose':
      // eslint-disable-next-line
      return get(metadata, ['annotations', 'garden.sapcloud.io/purpose'])
    case 'lastOperation':
      return get(item, 'status.lastOperation')
    case 'createdAt':
      return metadata.creationTimestamp
    case 'createdBy':
      return getCreatedBy(metadata)
    case 'project':
      return metadata.namespace
    case 'k8sVersion':
      return get(spec, 'kubernetes.version')
    case 'infrastructure':
      return getCloudProviderKind(spec.cloud)
    default:
      return metadata[sortBy]
  }
}

const getSortVal = (item, sortBy) => {
  const value = getRawSortVal(item, sortBy)
  const spec = item.spec
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
      // eslint-disable-next-line
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
    case 'k8sVersion':
      const k8sVersion = value
      const availableK8sUpdates = availableK8sUpdatesForShoot(spec)
      const sortPrefix = availableK8sUpdates ? '_' : ''
      return `${sortPrefix}${k8sVersion}`
    default:
      return toLower(value)
  }
}

const shoots = (state) => {
  return map(Object.keys(state.shoots), (key) => state.shoots[key])
}

const setSortedItems = (state) => {
  const sortBy = get(state, 'sortParams.sortBy')
  const descending = get(state, 'sortParams.descending', false) ? 'desc' : 'asc'
  if (sortBy) {
    state.sortedShoots = orderBy(shoots(state), [item => getSortVal(item, sortBy), 'metadata.name'], [descending, 'asc'])
  } else {
    state.sortedShoots = shoots(state)
  }
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
        if (!getRawSortVal(changes, sortBy)) {
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
  SET_SORTPARAMS (state, sortParams) {
    state.sortParams = sortParams
    setSortedItems(state)
  },
  SET_SEARCHVALUE (state, searchValue) {
    if (searchValue && searchValue.length > 0) {
      state.searchValue = split(searchValue, ' ')
    } else {
      state.searchValue = undefined
    }
    setSortedItems(state)
  },
  ITEM_PUT (state, newItem) {
    const sortRequired = putItem(state, newItem)

    if (sortRequired) {
      setSortedItems(state)
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
            // eslint-disable-next-line lodash/path-style
            rootState.onlyShootsWithIssues === !!get(event.object, ['metadata', 'labels', 'shoot.garden.sapcloud.io/unhealthy'])) {
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
      setSortedItems(state)
    }
  },
  CLEAR_ALL (state) {
    state.shoots = {}
    state.sortedShoots = []
  },
  SET_HIDE_USER_ISSUES (state, value) {
    state.hideUserIssues = value
  },
  SET_HIDE_DEACTIVATED_RECONCILIATION (state, value) {
    state.hideDeactivatedReconciliation = value
  }
}

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations
}
