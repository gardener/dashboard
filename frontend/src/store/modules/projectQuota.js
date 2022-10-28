//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import Vue from 'vue'
import { getResourceQuotas } from '@/utils/api'
import map from 'lodash/map'
import { aggregateResourceQuotaStatus } from '@/utils'

// initial state
const state = {
  all: {}
}

// getters
const getters = {
  quotaByNamespace (state) {
    return namespace => state.all[namespace]
  }
}

// actions
const actions = {
  async fetchProjectQuota ({ commit }, namespace) {
    const { data } = await getResourceQuotas({ namespace })

    const quotaStatuses = map(data, 'status')
    const aggregatedQuotaStatus = aggregateResourceQuotaStatus(quotaStatuses)

    commit('RECEIVE_PROJECT_QUOTA', { namespace, aggregatedQuotaStatus })
  }
}

// mutations
const mutations = {
  RECEIVE_PROJECT_QUOTA (state, { namespace, aggregatedQuotaStatus }) {
    Vue.set(state.all, namespace, aggregatedQuotaStatus)
  }
}

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations
}
