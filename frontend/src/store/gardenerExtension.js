//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useApi } from '@/composables'

export const useGardenerExtensionStore = defineStore('gardenerExtension', () => {
  const api = useApi()

  const list = ref(null)

  const isInitial = computed(() => {
    return list.value === null
  })

  async function fetchGardenerExtensions () {
    const response = await api.getGardenerExtensions()
    list.value = response.data
  }

  return {
    list,
    isInitial,
    fetchGardenerExtensions,
  }
})
