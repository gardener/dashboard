//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useApi } from '@/composables'

export const useKubeconfigStore = defineStore('kubeconfig', () => {
  const api = useApi()

  const data = ref(null)

  const isInitial = computed(() => {
    return data.value === null
  })

  async function fetchKubeconfig () {
    const response = await api.getKubeconfigData()
    data.value = response.data
  }

  return {
    data,
    isInitial,
    fetchKubeconfig,
  }
})