//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { getGardenerExtensions } from '@/utils/api'

// initial state
const state = {
  all: []
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
    const { data } = await getGardenerExtensions()
    commit('RECEIVE', data)
    return state.all
  }
}

// mutations
const mutations = {
  RECEIVE (state, items) {
    state.all = items
  }
}

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations
}
