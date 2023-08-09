//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

import map from 'lodash/map'

import { useApi } from '@/composables'
import { useAuthzStore } from '@/store/authz'
import {
  getProjectQuotaStatus,
  aggregateResourceQuotaStatus,
} from './helper'

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
