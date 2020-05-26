//
// Copyright (c) 2020 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file
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

import { getMembers, addMember, updateMember, deleteMember } from '@/utils/api'

// initial state
const state = {
  all: []
}

// getters
const getters = {}

// actions
const actions = {
  async getAll ({ commit, rootState }) {
    const namespace = rootState.namespace
    try {
      const res = await getMembers({ namespace })
      commit('RECEIVE', res.data)
      return state.all
    } catch (error) {
      commit('CLEAR')
      throw error
    }
  },
  async add ({ commit, rootState }, data) {
    const namespace = rootState.namespace
    const res = await addMember({ namespace, data })
    commit('RECEIVE', res.data)
  },
  async update ({ commit, rootState }, { name, roles }) {
    const namespace = rootState.namespace
    const res = await updateMember({ namespace, name, data: { roles } })
    commit('RECEIVE', res.data)
  },
  async delete ({ commit, rootState }, name) {
    const namespace = rootState.namespace
    const res = await deleteMember({ namespace, name })
    commit('RECEIVE', res.data)
  }
}

// mutations
const mutations = {
  RECEIVE (state, items) {
    state.all = items
  },
  CLEAR (state) {
    state.all = []
  }
}

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations
}
