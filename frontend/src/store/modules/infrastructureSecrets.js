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

import assign from 'lodash/assign'
import findIndex from 'lodash/findIndex'
import { getInfrastructureSecrets, updateInfrastructureSecret, createInfrastructureSecret, deleteInfrastructureSecret } from '@/utils/api'

// initial state
const state = {
  all: []
}

// getters
const getters = {
}

// actions
const actions = {
  getAll: ({ commit, rootState }) => {
    const namespace = rootState.namespace
    const user = rootState.user
    return getInfrastructureSecrets({user, namespace})
      .then(res => {
        commit('RECEIVE', res.data)
        return state.all
      })
  },
  update: ({ commit, rootState }, {metadata, data}) => {
    const user = rootState.user
    const namespace = metadata.namespace || rootState.namespace
    const bindingName = metadata.bindingName
    return updateInfrastructureSecret({user, namespace, bindingName, data: {metadata, data}})
      .then(res => {
        commit('ITEM_PUT', res.data)
        return res.data
      })
  },
  create: ({ commit, rootState }, {metadata, data}) => {
    const user = rootState.user
    const namespace = metadata.namespace || rootState.namespace
    return createInfrastructureSecret({user, namespace, data: {metadata, data}})
      .then(res => {
        commit('ITEM_PUT', res.data)
        return res.data
      })
  },
  delete ({ dispatch, commit, rootState }, bindingName) {
    const namespace = rootState.namespace
    const user = rootState.user
    return deleteInfrastructureSecret({namespace, bindingName, user})
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
