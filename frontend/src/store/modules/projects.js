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

import findIndex from 'lodash/findIndex'
import assign from 'lodash/assign'
import { getProjects, createProject, updateProject, deleteProject } from '@/utils/api'

// initial state
const state = {
  all: []
}

// getters
const getters = {
  namespaces (state) {
    return state.all
  }
}

// actions
const actions = {
  getAll ({ commit, rootState }) {
    const user = rootState.user
    return getProjects({ user })
      .then(res => {
        const list = res.data
        commit('RECEIVE', list)
        return state.all
      })
  },
  create ({ commit, rootState }, { metadata, data }) {
    const user = rootState.user
    const owner = user.profile.email
    data = assign({}, data, { owner })
    return createProject({ user, data: { metadata, data } })
      .then(res => {
        commit('ITEM_PUT', res.data)
        return res.data
      })
  },
  update ({ commit, rootState }, { metadata, data }) {
    const user = rootState.user
    const namespace = metadata.namespace || rootState.namespace
    return updateProject({ namespace, user, data: { metadata, data } })
      .then(res => {
        commit('ITEM_PUT', res.data)
        return res.data
      })
  },
  delete: ({ commit, rootState }, { metadata }) => {
    const user = rootState.user
    const namespace = metadata.namespace
    return deleteProject({ namespace, user })
      .then(res => {
        commit('ITEM_DELETED', metadata)
        return state.all
      })
  }
}

// mutations
const mutations = {
  RECEIVE (state, items) {
    state.all = items
  },
  ITEM_PUT (state, newItem) {
    const predicate = item => item.metadata.name === newItem.metadata.name
    const index = findIndex(state.all, predicate)
    if (index !== -1) {
      const item = state.all[index]
      state.all.splice(index, 1, assign({}, item, newItem))
    } else {
      state.all.push(newItem)
    }
  },
  ITEM_DELETED (state, metadata) {
    const predicate = item => item.metadata.namespace === metadata.namespace
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
