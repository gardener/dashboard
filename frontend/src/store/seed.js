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

import { useProjectStore } from './project'

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

  function canTolerateAllTaints (seed, project) {
    const seedTaints = get(seed, ['spec', 'taints'])

    if (!seedTaints || seedTaints.length === 0) {
      return true
    }

    const projectTolerations = get(project, ['spec', 'tolerations', 'defaults'], [])
    if (!projectTolerations || projectTolerations.length === 0) {
      return false
    }

    return seedTaints.every(taint => {
      return projectTolerations.some(toleration => {
        return toleration.key === taint.key
      })
    })
  }

  function getVisibleAndToleratedSeeds (project) {
    const predicate = seed => {
      const visible = get(seed, ['spec', 'settings', 'scheduling', 'visible'])

      if (!visible) {
        return false
      }

      return canTolerateAllTaints(seed, project)
    }
    return filter(list.value, predicate)
  }

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

  function seedsForCloudProfileByProject (cloudProfile, project) {
    if (!cloudProfile || !project) {
      return []
    }

    const seeds = getVisibleAndToleratedSeeds(project)

    if (!seeds.length > 0) {
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
    seedsForCloudProfileByProject,
    handleEvent: socketEventHandler.listener,
  }
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useSeedStore, import.meta.hot))
}
