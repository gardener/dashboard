//
// SPDX-FileCopyrightText: 2022 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

// initial state
const state = {
  readyState: 'closed',
  id: null,
  connected: false,
  active: false,
  reason: null,
  error: null,
  backoff: {
    min: 1000,
    max: 5000,
    factor: 2,
    jitter: 0.5,
    attempts: 0
  }
}

// getters
const getters = {
  active (state) {
    return state.active || state.backoff.attempts > 0
  },
  backoffDuration (state) {
    const { min, max, factor, jitter, attempts } = state.backoff
    const duration = min * Math.pow(factor, attempts)
    const rand = Math.random()
    const sign = Math.sign(rand - 0.5)
    const deviation = Math.floor(rand * jitter * duration)
    return Math.min(duration + sign * deviation, max)
  }
}

// actions
const actions = {
  setReadyState ({ commit }, value) {
    commit('SET_READY_STATE', value)
  },
  onConnect ({ commit }, [socket]) {
    commit('SET_ID', socket.id)
    commit('SET_CONNECTED', socket.connected)
    commit('SET_ACTIVE', socket.active)
  },
  onDisconnect ({ commit }, [socket, reason]) {
    commit('SET_CONNECTED', socket.connected)
    commit('SET_ACTIVE', socket.active)
    commit('SET_REASON', reason)
  },
  onError ({ commit }, [socket, err]) {
    commit('SET_CONNECTED', socket.connected)
    commit('SET_ACTIVE', socket.active)
    commit('SET_ERROR', err)
  }
}

// mutations
const mutations = {
  SET_READY_STATE (state, value) {
    state.readyState = value
  },
  SET_ID (state, value) {
    state.id = value
  },
  SET_CONNECTED (state, value) {
    if (value) {
      state.backoff.attempts = 0
      state.reason = null
      state.error = null
    }
    state.connected = value
  },
  SET_ACTIVE (state, value) {
    state.active = value
  },
  SET_REASON (state, value) {
    state.reason = value
  },
  SET_ERROR (state, error) {
    state.error = error
  },
  BACKOFF_RESET (state) {
    state.backoff.attempts = 0
  },
  BACKOFF_INCREASE_ATTEMPTS (state) {
    state.backoff.attempts++
  },
  CONNECT () {
    // only used to trigger `socket.connect()`
  }
}

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations
}
