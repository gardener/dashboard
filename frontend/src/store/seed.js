//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useApi } from '@/composables'
import find from 'lodash/find'
import get from 'lodash/get'

export const useSeedStore = defineStore('seed', () => {
  const api = useApi()

  const list = ref(null)

  const isInitial = computed(() => {
    return list.value === null
  })

  async function fetchSeeds () {
    const response = await api.getSeeds()
    list.value = response.data
  }

  function seedByName (name) {
    return find(list.value, ['metadata.name', name])
  }

  function isSeedUnreachableByName (name) {
    const seed = seedByName(name)
    return get(seed, 'metadata.unreachable')
  }

  return {
    list,
    isInitial,
    fetchSeeds,
    seedByName,
    isSeedUnreachableByName,
  }
})
