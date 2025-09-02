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

  function canTolerateAllTaints (seed, project) {
    const seedTaints = get(seed, ['spec', 'taints']) ?? []
    if (seedTaints.length === 0) {
      return true
    }

    const projectTolerations = get(project, ['spec', 'tolerations', 'defaults']) ?? []
    if (projectTolerations.length === 0) {
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
    const labelMatcher = !isEmpty(matchLabels)
      ? matches(matchLabels)
      : null
    const providerTypes = get(cloudProfile, ['spec', 'seedSelector', 'providerTypes'], [providerType])

    return function matchSeed (seed) {
      const seedProviderType = get(seed, ['spec', 'provider', 'type'])
      const providerTypeMatches = providerTypes.includes(seedProviderType) || providerTypes.includes('*')

      if (!providerTypeMatches) {
        return false
      }

      if (labelMatcher) {
        const seedLabels = get(seed, ['metadata', 'labels'], {})
        return labelMatcher(seedLabels)
      }

      return true
    }
  }

  /**
   * Returns seeds that match the cloud profile's seed selector and are tolerated by the project.
   *
   * @param {Object} cloudProfile - The cloud profile containing seed selector criteria
   * @param {Object} [project] - Optional project with toleration settings. When provided,
   *                            project tolerations are used to filter seeds with taints
   * @returns {Array} Array of seed objects that match the cloud profile and are accessible
   *                  to the project, or empty array if no matches found
   */
  function seedsForCloudProfileByProject (cloudProfile, project) {
    if (!cloudProfile) {
      return []
    }

    const seeds = getVisibleAndToleratedSeeds(project)

    if (seeds.length === 0) {
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
