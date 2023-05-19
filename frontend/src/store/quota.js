//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

import map from 'lodash/map'
import round from 'lodash/round'
import replace from 'lodash/replace'
import upperFirst from 'lodash/upperFirst'
import assignWith from 'lodash/assignWith'
import sortBy from 'lodash/sortBy'
import head from 'lodash/head'
import split from 'lodash/split'

import { useApi } from '@/composables'
import { useAuthzStore } from './authz'

function getProjectQuotaStatus (quota) {
  if (!quota) {
    return undefined
  }

  const { hard, used } = quota
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
      progressColor,
    }
  })

  return sortBy(quotaStatus, 'caption')
}

function aggregateResourceQuotaStatus (quota) {
  const customizer = (a, b) => parseInt(b) > parseInt(a) ? b : a
  return {
    hard: assignWith({}, ...map(quota, 'hard'), customizer),
    used: assignWith({}, ...map(quota, 'used'), customizer),
  }
}

export const useQuotaStore = defineStore('quota', () => {
  const api = useApi()
  const authzStore = useAuthzStore()

  const quotas = ref({})

  const projectQuotaStatus = computed(() => {
    const namespace = authzStore.namespace
    const quota = quotas.value[namespace]
    return quota
      ? getProjectQuotaStatus(quota)
      : []
  })

  async function fetchQuotas (namespace = authzStore.namespace) {
    const response = await api.getResourceQuotas({ namespace })
    quotas.value[namespace] = aggregateResourceQuotaStatus(map(response.data, 'status'))
  }

  return {
    quotas,
    projectQuotaStatus,
    fetchQuotas,
  }
})
