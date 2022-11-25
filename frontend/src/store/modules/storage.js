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
  autoLoginEnabled (state) {
    return state['global/auto-login'] === 'enabled'
  },
  isDeveloperModeEnabled (state) {
    return state['global/developer-mode'] === 'enabled'
  },
  gardenctlOptions (state, getters, rootState) {
    const options = {
      legacyCommands: false,
      ...rootState.cfg?.gardenctl
    }
    try {
      Object.assign(options, JSON.parse(state['global/gardenctl']))
    } catch (err) { /* ignore error */ }
    return options
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
  },
  setDeveloperMode ({ commit }, value) {
    commit('SET_ITEM', ['global/developer-mode', value ? 'enabled' : 'disabled'])
  },
  setGardenctlOptions ({ commit }, options) {
    const value = JSON.stringify(options)
    commit('SET_ITEM', ['global/gardenctl', value])
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
