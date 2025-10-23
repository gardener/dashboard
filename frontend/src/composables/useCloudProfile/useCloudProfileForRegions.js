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

import map from 'lodash/map'
import filter from 'lodash/filter'
import find from 'lodash/find'
import get from 'lodash/get'
import uniq from 'lodash/uniq'
import difference from 'lodash/difference'
import some from 'lodash/some'

/**
 * Composable for cloud profile region and zone management
 * @param {Ref<CloudProfile>} cloudProfile - Vue ref containing the cloud profile object
 * @returns {Object} Object containing computed properties and functions for regions/zones
 */
export function useCloudProfileForRegions (cloudProfile) {
  if (!isRef(cloudProfile)) {
    throw new Error('cloudProfile must be a ref!')
  }

  const seedStore = useSeedStore()

  /**
   * Check if region is valid for the cloud profile
   * @param {Ref<String>} region - Vue ref containing the region name
   * @returns {ComputedRef<Boolean>} Computed ref indicating if region is valid
   */
  function isValidRegion (region) {
    return computed(() => {
      if (!isRef(region)) {
        throw new Error('region must be a ref!')
      }

      const providerType = get(cloudProfile.value, ['spec', 'type'])

      if (providerType === 'azure') {
        // Azure regions may not be zoned, need to filter these out for the dashboard
        const zones = zonesByRegion(region).value
        return !!zones.length
      }

      // Filter regions that are not defined in cloud profile
      return some(get(cloudProfile.value, ['spec', 'regions'], []), ['name', region.value])
    })
  }

  /**
   * Get zones for a specific region
   * @param {Ref<String>} region - Vue ref containing the region name
   * @returns {ComputedRef<Array<String>>} Computed ref of zone names
   */
  function zonesByRegion (region) {
    return computed(() => {
      if (!isRef(region)) {
        throw new Error('region must be a ref!')
      }

      if (!cloudProfile.value) {
        return []
      }

      const regionObj = find(
        get(cloudProfile.value, ['spec', 'regions'], []),
        { name: region.value },
      )
      return map(get(regionObj, ['zones'], []), 'name')
    })
  }

  /**
   * Get regions that have seed availability
   * @param {Ref<Object>} project - Vue ref containing the project object
   * @returns {ComputedRef<Array<String>>} Computed ref of region names with seeds
   */
  function regionsWithSeed (project) {
    return computed(() => {
      if (!isRef(project)) {
        throw new Error('project must be a ref!')
      }

      if (!cloudProfile.value) {
        return []
      }

      const seeds = seedStore.seedsForCloudProfileByProject(cloudProfile.value, project.value)

      // need to use get as map does not support array paths
      const uniqueSeedRegions = uniq(map(seeds, seed => get(seed, ['spec', 'provider', 'region'])))
      const uniqueSeedRegionsWithZones = filter(uniqueSeedRegions, regionName => {
        const regionRef = computed(() => regionName)
        return isValidRegion(regionRef).value
      })
      return uniqueSeedRegionsWithZones
    })
  }

  /**
   * Get regions without seed availability
   * @param {Ref<Object>} project - Vue ref containing the project object
   * @returns {ComputedRef<Array<String>>} Computed ref of region names without seeds
   */
  function regionsWithoutSeed (project) {
    return computed(() => {
      if (!isRef(project)) {
        throw new Error('project must be a ref!')
      }

      if (!cloudProfile.value) {
        return []
      }

      const regionsWithSeedList = regionsWithSeed(project).value
      const regionsInCloudProfile = map(get(cloudProfile.value, ['spec', 'regions'], []), 'name')
      const regionsInCloudProfileWithZones = filter(regionsInCloudProfile, regionName => {
        const regionRef = computed(() => regionName)
        return isValidRegion(regionRef).value
      })
      const regionsWithoutSeedList = difference(regionsInCloudProfileWithZones, regionsWithSeedList)
      return regionsWithoutSeedList
    })
  }

  return {
    isValidRegion,
    zonesByRegion,
    regionsWithSeed,
    regionsWithoutSeed,
  }
}
