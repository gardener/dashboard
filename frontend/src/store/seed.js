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

import { useApi } from '@/composables/useApi'
import { useLogger } from '@/composables/useLogger'
import { useSocketEventHandler } from '@/composables/useSocketEventHandler'

import find from 'lodash/find'
import get from 'lodash/get'
import keyBy from 'lodash/keyBy'

export const useSeedStore = defineStore('seed', () => {
  const api = useApi()
  const logger = useLogger()

  const list = ref(null)

  const isInitial = computed(() => {
    return list.value === null
  })

  const seedList = computed(() => {
    return list.value
  })

  async function fetchSeeds () {
    const response = await api.getSeeds()
    list.value = response.data
  }

  function seedByName (name) {
    return find(list.value, ['metadata.name', name])
  }

  function seedsForCloudProfile (cloudProfile) {
    const seeds = []
    const seedsByName = keyBy(list.value, 'metadata.name')
    const names = get(cloudProfile, ['data', 'seedNames'], [])
    for (const name of names) {
      const seed = get(seedsByName, [name])
      if (seed) {
        seeds.push(seed)
      }
    }
    return seeds
  }

  const socketEventHandler = useSocketEventHandler(useSeedStore, {
    logger,
  })
  socketEventHandler.start(500)

  return {
    list,
    isInitial,
    seedList,
    fetchSeeds,
    seedByName,
    seedsForCloudProfile,
    handleEvent: socketEventHandler.listener,
  }
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useSeedStore, import.meta.hot))
}
