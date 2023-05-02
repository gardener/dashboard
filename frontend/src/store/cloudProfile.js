//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useApi } from '@/composables'

export const useCloudProfileStore = defineStore('cloudProfile', () => {
  const api = useApi()

  const list = ref(null)

  const isInitial = computed(() => {
    return list.value === null
  })

  const cloudProfileList = computed(() => {
    return list.value ?? []
  })

  async function fetchCloudProfiles () {
    const response = await api.getCloudprofiles()
    list.value = response.data
  }

  return {
    isInitial,
    cloudProfileList,
    fetchCloudProfiles,
  }
})
