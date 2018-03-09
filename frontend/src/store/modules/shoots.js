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

import find from 'lodash/find'
import findIndex from 'lodash/findIndex'
import assign from 'lodash/assign'
import pick from 'lodash/pick'
import get from 'lodash/get'
import replace from 'lodash/replace'
import { getShoots, getShoot, getShootInfo, createShoot, deleteShoot } from '@/utils/api'
import { isNotFound } from '@/utils/error'

const uriPattern = /^([^:/?#]+:)?(\/\/[^/?#]*)?([^?#]*)(\?[^#]*)?(#.*)?/

const eql = ({namespace, name}) => {
  return item => item.metadata.namespace === namespace && item.metadata.name === name
}

// initial state
const state = {
  all: [],
  selection: undefined
}

// getters
const getters = {
  items (state) {
    return state.all
  },
  selectedItem () {
    if (state.selection) {
      const predicate = eql(state.selection)
      return find(state.all, predicate)
    }
  }
}

// actions
const actions = {
  /**
   * Return all shoots in the given namespace.
   * This ends always in a server/backend call.
   */
  getAll ({ commit, dispatch, rootState }) {
    const namespace = rootState.namespace
    const user = rootState.user
    return getShoots({namespace, user})
      .then(res => {
        const list = res.data
        commit('RECEIVE', list)
        return state.all
      })
  },
  get ({ dispatch, commit, rootState }, name) {
    const namespace = rootState.namespace
    const user = rootState.user
    return getShoot({namespace, name, user})
      .then(res => {
        const item = res.data
        commit('ITEM_PUT', item)
      })
      .then(() => dispatch('getInfo', {name, namespace}))
      .then(() => find(state.all, eql({namespace, name})))
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
    const predicate = eql(metadata)
    const item = find(state.all, predicate)
    if (item) {
      commit('SET_SELECTION', pick(metadata, ['namespace', 'name']))
      if (!item.info) {
        return dispatch('getInfo', {name: metadata.name, namespace: metadata.namespace})
      }
    }
  }
}

// mutations
const mutations = {
  RECEIVE (state, { items }) {
    state.all = items
  },
  RECEIVE_INFO (state, { namespace, name, info }) {
    const index = findIndex(state.all, eql({namespace, name}))
    if (index !== -1) {
      const item = state.all[index]
      state.all.splice(index, 1, assign({}, item, {info}))
    }
  },
  SET_SELECTION (state, metadata) {
    state.selection = metadata
  },
  ITEM_PUT (state, newItem) {
    const index = findIndex(state.all, eql(newItem.metadata))
    if (index !== -1) {
      const item = state.all[index]
      if (item.metadata.resourceVersion !== newItem.metadata.resourceVersion) {
        state.all.splice(index, 1, assign({}, item, newItem))
      }
    } else {
      state.all.push(newItem)
    }
  },
  ITEM_DEL (state, deletedItem) {
    const index = findIndex(state.all, eql(deletedItem.metadata))
    if (index !== -1) {
      state.all.splice(index, 1)
    }
  }
}

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations
}
