//
// SPDX-FileCopyrightText: 2022 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import Vue from 'vue'
import { getResourceQuotas } from '@/utils/api'
import map from 'lodash/map'
import { aggregateResourceQuotaStatus } from '@/utils'

// initial state
const state = {}

// getters
const getters = {
  quotaByNamespace (state) {
    return namespace => state[namespace]
  }
}

// actions
const actions = {
  async fetchProjectQuota ({ commit }, namespace) {
    const { data } = await getResourceQuotas({ namespace })

    const quotaStatuses = map(data, 'status')
    const aggregatedQuotaStatus = aggregateResourceQuotaStatus(quotaStatuses)

    commit('SET_AGGREGATED_QUOTA', [namespace, aggregatedQuotaStatus])
  }
}

// mutations
const mutations = {
  SET_AGGREGATED_QUOTA (state, args) {
    Vue.set(state, ...args)
  }
}

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations
}
