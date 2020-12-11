//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { getControllerRegistrations, getNetworkingTypes } from '@/utils/api'

// initial state
const state = {
  all: [],
  networkingTypes: []
}

// getters
const getters = {
  items (state) {
    return state.all
  }
}

// actions
const actions = {
  async getAll ({ commit, state }) {
    const { data } = await getControllerRegistrations()
    commit('RECEIVE', data)
    return state.all
  },
  async getNetworkingTypes ({ commit, state }) {
    const { data } = await getNetworkingTypes()
    commit('RECEIVE_NETWORKING_TYPES', data)
    return state.networkingTypes
  }
}

// mutations
const mutations = {
  RECEIVE (state, items) {
    state.all = items
  },
  RECEIVE_NETWORKING_TYPES (state, items) {
    state.networkingTypes = items
  }
}

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations
}
