//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { getGardenerExtensions } from '@/utils/api'

import map from 'lodash/map'
import flatMap from 'lodash/flatMap'
import filter from 'lodash/filter'

// initial state
const state = {
  all: []
}

// getters
const getters = {
  items (state) {
    return state.all
  },
  networkingTypes (state) {
    const resources = flatMap(state.all, 'resources')
    const networkingResources = filter(resources, ['kind', 'Network'])
    return map(networkingResources, 'type')
  },
  dnsProviderList (state) {
    const resources = flatMap(state.all, 'resources')
    return filter(resources, ['kind', 'DNSProvider'])
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
