//
// SPDX-FileCopyrightText: 2022 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import Vue from 'vue'

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
  isDeveloperModeEnabled (state) {
    return state['global/developer-mode'] === 'enabled'
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
  setDeveloperMode ({ commit }, value) {
    commit('SET_ITEM', ['global/developer-mode', value ? 'enabled' : 'disabled'])
  }
}

// mutations
const mutations = {
  CLEAR (state) {
    for (const key in state) {
      Vue.delete(state, key)
    }
  },
  SET_ITEM (state, args) {
    Vue.set(state, ...args)
  },
  REMOVE_ITEM (state, key) {
    Vue.delete(state, key)
  }
}

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations
}
