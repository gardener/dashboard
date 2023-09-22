//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  defineStore,
  acceptHMRUpdate,
} from 'pinia'
import {
  ref,
  computed,
} from 'vue'

import { useAuthzStore } from '@/store/authz'

import { useApi } from '@/composables/useApi'

import {
  getProjectQuotaStatus,
  aggregateResourceQuotaStatus,
} from './helper'

import { map } from '@/lodash'

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

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useQuotaStore, import.meta.hot))
}
