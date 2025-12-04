//
// SPDX-FileCopyrightText: 2025 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  computed,
  isRef,
} from 'vue'

import { useSeedStore } from '@/store/seed'

import { getZones } from '@/composables/helper'

import map from 'lodash/map'
import filter from 'lodash/filter'
import get from 'lodash/get'
import uniq from 'lodash/uniq'
import difference from 'lodash/difference'
import some from 'lodash/some'

/**
 * Composable for cloud profile region and zone management
 * @param {Ref<CloudProfile>} cloudProfile - Vue ref containing the cloud profile object
 * @returns {Object} Object containing computed properties and functions for regions/zones
 */
export function useRegions (cloudProfile) {
  if (!isRef(cloudProfile)) {
    throw new Error('cloudProfile must be a ref!')
  }

  /**
   * Check if region is valid for the cloud profile
   * @returns Boolean Computed ref indicating if region is valid
   * @param region
   */
  function isValidRegion (region) {
    const providerType = get(cloudProfile.value, ['spec', 'type'])

    if (providerType === 'azure') {
      // Azure regions may not be zoned, need to filter these out for the dashboard
      const zones = getZones(cloudProfile.value, region)
      return !!zones.length
    }

    // Filter regions that are not defined in cloud profile
    return some(get(cloudProfile.value, ['spec', 'regions'], []), ['name', region])
  }

  /**
   * Get zones for a specific region
   * @param {Ref<String>} region - Vue ref containing the region name
   * @returns {ComputedRef<Array<String>>} Computed ref of zone names
   */
  function useZones (region) {
    if (!isRef(region)) {
      throw new Error('region must be a ref!')
    }
    return computed(() => {
      return getZones(cloudProfile.value, region.value)
    })
  }
  /**
   * Get regions that have seed availability
   * @param {Ref<Object>} project - Vue ref containing the project object
   * @returns {ComputedRef<Array<String>>} Computed ref of region names with seeds
   */
  function useRegionsWithSeed (project) {
    const seedStore = useSeedStore()
    if (!isRef(project)) {
      throw new Error('project must be a ref!')
    }

    return computed(() => {
      if (!cloudProfile.value) {
        return []
      }

      const seeds = seedStore.seedsForCloudProfileByProject(cloudProfile.value, project.value)

      // need to use get as map does not support array paths
      const uniqueSeedRegions = uniq(map(seeds, seed => get(seed, ['spec', 'provider', 'region'])))
      const uniqueSeedRegionsWithZones = filter(uniqueSeedRegions, regionName => {
        return isValidRegion(regionName)
      })
      return uniqueSeedRegionsWithZones
    })
  }

  /**
   * Get regions without seed availability
   * @param {Ref<Object>} project - Vue ref containing the project object
   * @returns {ComputedRef<Array<String>>} Computed ref of region names without seeds
   */
  function useRegionsWithoutSeed (project) {
    if (!isRef(project)) {
      throw new Error('project must be a ref!')
    }

    const useRegionsWithSeedList = useRegionsWithSeed(project)
    return computed(() => {
      if (!cloudProfile.value) {
        return []
      }

      const regionsInCloudProfile = map(get(cloudProfile.value, ['spec', 'regions'], []), 'name')
      const regionsInCloudProfileWithZones = filter(regionsInCloudProfile, regionName => {
        return isValidRegion(regionName)
      })
      const regionsWithoutSeedList = difference(regionsInCloudProfileWithZones, useRegionsWithSeedList.value)
      return regionsWithoutSeedList
    })
  }

  return {
    useZones,
    useRegionsWithSeed,
    useRegionsWithoutSeed,
  }
}
