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
import filter from 'lodash/filter'
import isEmpty from 'lodash/isEmpty'
import matches from 'lodash/matches'

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

  function getVisibleAndNotProtectedSeeds () {
    const predicate = item => {
      const taints = get(item, ['spec', 'taints'])
      const unprotected = !find(taints, ['key', 'seed.gardener.cloud/protected'])
      const visible = get(item, ['spec', 'settings', 'scheduling', 'visible'])
      return unprotected && visible
    }
    return filter(list.value, predicate)
  }

  // Higher-order function that creates a seed matcher for a cloud profile
  function createSeedMatcher (cloudProfile) {
    if (!cloudProfile) {
      return () => false
    }

    const providerType = get(cloudProfile, ['spec', 'type'])
    const matchLabels = get(cloudProfile, ['spec', 'seedSelector', 'matchLabels'])
    const providerTypes = get(cloudProfile, ['spec', 'seedSelector', 'providerTypes'], [providerType])

    return function matchSeed (seed) {
      // Check provider type matching
      const seedProviderType = get(seed, ['spec', 'provider', 'type'])
      const providerTypeMatches = providerTypes.some(type => [seedProviderType, '*'].includes(type))

      if (!providerTypeMatches) {
        return false
      }

      // Check label selector matching if specified
      if (matchLabels && !isEmpty(matchLabels)) {
        const seedLabels = get(seed, ['metadata', 'labels'], {})
        const labelMatcher = matches(matchLabels)
        return labelMatcher(seedLabels)
      }

      return true
    }
  }

  function seedsForCloudProfile (cloudProfile) {
    const seeds = getVisibleAndNotProtectedSeeds()

    if (!cloudProfile || !seeds.length > 0) {
      return []
    }

    const seedMatcher = createSeedMatcher(cloudProfile)
    return filter(seeds, seedMatcher)
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
