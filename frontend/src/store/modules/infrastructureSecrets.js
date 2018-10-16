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

import assign from 'lodash/assign'
import findIndex from 'lodash/findIndex'
import find from 'lodash/find'
import matches from 'lodash/matches'
import { getInfrastructureSecrets, updateInfrastructureSecret, createInfrastructureSecret, deleteInfrastructureSecret } from '@/utils/api'

const eqlNameAndNamespace = ({ namespace, name }) => {
  return matches({ metadata: { namespace, name } })
}

// initial state
const state = {
  all: []
}

// getters
const getters = {
  getInfrastructureSecretByName: (state) => ({ name, namespace }) => {
    return find(state.all, eqlNameAndNamespace({ name, namespace }))
  }
}

// actions
const actions = {
  getAll: ({ commit, rootState }) => {
    const namespace = rootState.namespace
    const user = rootState.user
    return getInfrastructureSecrets({ user, namespace })
      .then(res => {
        commit('RECEIVE', res.data)
        return state.all
      })
      .catch(error => {
        commit('CLEAR')
        throw error
      })
  },
  update: ({ commit, rootState }, { metadata, data }) => {
    const user = rootState.user
    const namespace = metadata.namespace || rootState.namespace
    const bindingName = metadata.bindingName
    return updateInfrastructureSecret({ user, namespace, bindingName, data: { metadata, data } })
      .then(res => {
        commit('ITEM_PUT', res.data)
        return res.data
      })
  },
  create: ({ commit, rootState }, { metadata, data }) => {
    const user = rootState.user
    const namespace = metadata.namespace || rootState.namespace
    return createInfrastructureSecret({ user, namespace, data: { metadata, data } })
      .then(res => {
        commit('ITEM_PUT', res.data)
        return res.data
      })
  },
  delete ({ dispatch, commit, rootState }, bindingName) {
    const namespace = rootState.namespace
    const user = rootState.user
    return deleteInfrastructureSecret({ namespace, bindingName, user })
      .then(res => {
        commit('ITEM_DELETED', res.data)
        return res.data
      })
  }
}

// mutations
const mutations = {
  RECEIVE (state, items) {
    state.all = items
  },
  CLEAR (state) {
    state.all = []
  },
  ITEM_PUT (state, newItem) {
    const iteratee = item => item.metadata.name === newItem.metadata.name
    const index = findIndex(state.all, iteratee)
    if (index !== -1) {
      const item = state.all[index]
      state.all.splice(index, 1, assign({}, item, newItem))
    } else {
      state.all.push(newItem)
    }
  },
  ITEM_DELETED (state, deletedItem) {
    const predicate = item => item.metadata.name === deletedItem.metadata.name
    const index = findIndex(state.all, predicate)
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
