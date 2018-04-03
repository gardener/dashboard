//
// Copyright 2018 by The Gardener Authors.
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
import { getShoot, getShootInfo, createShoot, deleteShoot } from '@/utils/api'
import { isNotFound } from '@/utils/error'

const uriPattern = /^([^:/?#]+:)?(\/\/[^/?#]*)?([^?#]*)(\?[^#]*)?(#.*)?/

const keyForShoot = ({name, namespace}) => {
  return `${name}_${namespace}`
}

const findItem = ({name, namespace}) => {
  return state.shoots[keyForShoot({name, namespace})]
}

// initial state
const state = {
  shoots: {},
  selection: undefined
}

// getters
const getters = {
  items (state) {
    return map(Object.keys(state.shoots), (key) => state.shoots[key])
  },
  itemByNameAndNamespace () {
    return ({namespace, name}) => {
      return findItem({name, namespace})
    }
  },
  selectedItem () {
    if (state.selection) {
      return findItem(state.selection)
    }
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
  get ({ dispatch, commit, rootState }, {name, namespace}) {
    const user = rootState.user
    return getShoot({namespace, name, user})
      .then(res => {
        const item = res.data
        commit('ITEM_PUT', item)
      })
      .then(() => dispatch('getInfo', {name, namespace}))
      .then(() => findItem({name, namespace}))
  },
  create ({ dispatch, commit, rootState }, data) {
    const namespace = data.metadata.namespace || rootState.namespace
    const user = rootState.user
    return createShoot({namespace, user, data})
  },
  delete ({ dispatch, commit, rootState }, {name, namespace}) {
    const user = rootState.user
    return deleteShoot({namespace, name, user})
  },
  /**
   * Return the given info for a single shoot with the namespace/name.
   * This ends always in a server/backend call.
   */
  getInfo ({ commit, rootState }, {name, namespace}) {
    const user = rootState.user
    return getShootInfo({namespace, name, user})
      .then(res => res.data)
      .then(info => {
        let credentials = ''
        if (!!info.username && !!info.password) {
          credentials = `${info.username}:${info.password}@`
        }

        if (info.serverUrl) {
          const [, scheme, host] = uriPattern.exec(info.serverUrl)
          const authority = `//${credentials}${replace(host, /^\/\//, '')}`
          const pathnameAlias = '/ui'
          const pathname = get(rootState.cfg, 'dashboardUrl.pathname', pathnameAlias)
          info.dashboardUrl = [scheme, authority, pathname].join('')
          info.dashboardUrlText = [scheme, host, pathnameAlias].join('')
        }

        if (info.shootIngressDomain) {
          const grafanaPathname = get(rootState.cfg, 'grafanaUrl.pathname', '')
          const grafanaHost = `g.${info.shootIngressDomain}`
          info.grafanaUrl = `https://${credentials}${grafanaHost}${grafanaPathname}`
          info.grafanaUrlText = `https://${grafanaHost}`

          const prometheusHost = `p.${info.shootIngressDomain}`
          info.prometheusUrl = `https://${credentials}${prometheusHost}`
          info.prometheusUrlText = `https://${prometheusHost}`

          const alertmanagerHost = `a.${info.shootIngressDomain}`
          info.alertmanagerUrl = `https://${credentials}${alertmanagerHost}`
          info.alertmanagerUrlText = `https://${alertmanagerHost}`
        }
        return info
      })
      .then(info => {
        commit('RECEIVE_INFO', {name, namespace, info})
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
        return dispatch('getInfo', {name: metadata.name, namespace: metadata.namespace})
      }
    }
  }
}

const putItem = (state, newItem) => {
  const item = findItem(newItem.metadata)
  if (item !== undefined) {
    if (item.metadata.resourceVersion !== newItem.metadata.resourceVersion) {
      Vue.set(state.shoots, keyForShoot(item.metadata), assign({}, item, newItem))
    }
  } else {
    Vue.set(state.shoots, keyForShoot(newItem.metadata), newItem)
  }
}

// mutations
const mutations = {
  RECEIVE_INFO (state, { namespace, name, info }) {
    const item = findItem({namespace, name})
    if (item !== undefined) {
      state.shoots[keyForShoot(item.metadata)] = assign({}, item, {info})
    }
  },
  SET_SELECTION (state, metadata) {
    state.selection = metadata
  },
  ITEM_PUT (state, newItem) {
    putItem(state, newItem)
  },
  ITEMS_PUT (state, newItems) {
    forEach(newItems, newItem => putItem(state, newItem))
  },
  ITEM_DEL (state, deletedItem) {
    const item = findItem(deletedItem.metadata)
    if (item !== undefined) {
      // use undefined instead of delete for performance reasons
      state.shoots[keyForShoot(item.metadata)] = undefined
    }
  },
  CLEAR_ALL (state) {
    state.shoots = {}
  }
}

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations
}
