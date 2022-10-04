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
  subscribed: false,
  active: false,
  reason: null,
  error: null,
  reconnectAttempt: 0
}

// getters
const getters = {
  notClosed (state) {
    return state.readyState !== 'closed'
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
    if (['io server disconnect'].includes(reason)) {
      commit('RECONNECT_ATTEMPT')
    }
  },
  onError ({ commit }, [socket, err]) {
    commit('SET_CONNECTED', socket.connected)
    commit('SET_ACTIVE', socket.active)
    commit('SET_ERROR', err)
    if (!socket.active) {
      commit('RECONNECT_ATTEMPT')
    }
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
      state.reconnectAttempt = 0
      state.reason = null
      state.error = null
    }
    state.subscribed = false
    state.connected = value
  },
  SET_SUBSCRIBED (state, value) {
    state.subscribed = value
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
  RECONNECT_ATTEMPT (state) {
    // give up after 10 manual reconnection attempts
    if (state.reconnectAttempt < 10) {
      state.reconnectAttempt += 1
    } else {
      state.reconnectAttempt = 0
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
