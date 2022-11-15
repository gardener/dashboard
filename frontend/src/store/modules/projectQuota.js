//
// SPDX-FileCopyrightText: 2022 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import Vue from 'vue'
import { getResourceQuotas } from '@/utils/api'
import map from 'lodash/map'
import round from 'lodash/round'
import replace from 'lodash/replace'
import upperFirst from 'lodash/upperFirst'
import assignWith from 'lodash/assignWith'
import sortBy from 'lodash/sortBy'
import head from 'lodash/head'
import split from 'lodash/split'

// initial state
const state = {}

function getProjectQuotaStatus (projectQuota) {
  if (!projectQuota) {
    return undefined
  }

  const { hard, used } = projectQuota
  const quotaStatus = map(hard, (limitValue, key) => {
    const usedValue = used[key] || 0
    const percentage = round((usedValue / limitValue) * 100, 2)
    const resourceName = replace(key, 'count/', '')
    const caption = upperFirst(head(split(resourceName, '.')))
    let progressColor = 'primary'

    if (percentage >= 100) {
      progressColor = 'error'
    } else if (percentage >= 80) {
      progressColor = 'warning'
    }

    return {
      key,
      resourceName,
      caption,
      limitValue,
      usedValue,
      percentage,
      progressColor
    }
  })

  return sortBy(quotaStatus, 'caption')
}

function aggregateResourceQuotaStatus (quotaResourceStatus) {
  const aggregatedQuotaHard = {}
  assignWith(aggregatedQuotaHard, ...map(quotaResourceStatus, 'hard'), (valA, valB) => {
    if (parseInt(valB) < parseInt(valA)) {
      return valB
    }
    return valA
  })
  const aggregatedQuotaUsed = {}
  assignWith(aggregatedQuotaUsed, ...map(quotaResourceStatus, 'used'), (valA, valB) => {
    if (parseInt(valB) > parseInt(valA)) {
      return valB
    }
    return valA
  })
  return { hard: aggregatedQuotaHard, used: aggregatedQuotaUsed }
}

// getters
const getters = {
  status (state, getters, rootState) {
    const quota = state[rootState.namespace]
    return quota
      ? getProjectQuotaStatus(quota)
      : []
  }
}

// actions
const actions = {
  async fetchProjectQuota ({ commit }, namespace) {
    const { data } = await getResourceQuotas({ namespace })
    commit('SET_RESOURCE_QUOTAS', [namespace, data])
  }
}

// mutations
const mutations = {
  SET_RESOURCE_QUOTAS (state, [key, quotas]) {
    const value = aggregateResourceQuotaStatus(map(quotas, 'status'))
    Vue.set(state, key, value)
  }
}

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations
}
