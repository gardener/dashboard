//
// SPDX-FileCopyrightText: 2022 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

// initial state
const state = {}

// getters
const getters = {
  logLevel (state) {
    return state['global/log-level']
  },
  colorScheme (state) {
    return state['global/color-scheme']
  },
  socketStateEnabled (state) {
    return state['global/socket-state'] === 'enabled'
  },
  autoLoginEnabled (state) {
    return state['global/auto-login'] === 'enabled'
  }
}

// actions
const actions = {
  setLogLevel ({ commit }, value) {
    commit('SET_ITEM', ['global/log-level', value])
  },
  setColorScheme ({ commit }, value) {
    commit('SET_ITEM', ['global/color-scheme', value])
  },
  setAutoLogin ({ commit }, value) {
    commit('SET_ITEM', ['global/auto-login', value ? 'enabled' : 'disabled'])
  }
}

// mutations
const mutations = {
  CLEAR (state) {
    for (const key in state) {
      delete state[key]
    }
  },
  SET_ITEM (state, [key, value]) {
    state[key] = value
  },
  REMOVE_ITEM (state, key) {
    delete state[key]
  }
}

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations
}
