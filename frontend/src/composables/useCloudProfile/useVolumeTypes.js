//
// SPDX-FileCopyrightText: 2025 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  computed,
  isRef,
} from 'vue'

import { useRegions } from './useRegions.js'

import get from 'lodash/get'
import filter from 'lodash/filter'
import includes from 'lodash/includes'
import find from 'lodash/find'
import map from 'lodash/map'
import intersection from 'lodash/intersection'

/**
 * Composable for cloud profile volume type management
 * @param {Ref<CloudProfile>} cloudProfile - Vue ref containing the cloud profile object
 * @returns {Object} Object containing computed properties and functions for volume types
 */
export function useVolumeTypes (cloudProfile) {
  if (!isRef(cloudProfile)) {
    throw new Error('cloudProfile must be a ref!')
  }

  const { useZones } = useRegions(cloudProfile)

  /**
   * Get all volume types from cloud profile
   */
  const volumeTypes = computed(() => {
    return get(cloudProfile.value, ['spec', 'volumeTypes'], [])
  })

  /**
   * Get volume types filtered by region availability
   * @param {Ref<String>} region - Vue ref containing the region name
   * @returns {ComputedRef<Array>} Computed ref of available volume types
   */
  function useFilteredVolumeTypes (region) {
    if (!isRef(region)) {
      throw new Error('region must be a ref!')
    }
    const zones = useZones(region)

    return computed(() => {
      if (!cloudProfile.value) {
        return []
      }

      const items = volumeTypes.value
      if (!region.value) {
        return items
      }

      const regions = get(cloudProfile.value, ['spec', 'regions'], [])
      const regionObject = find(regions, { name: region.value })
      let regionZones = get(regionObject, ['zones'], [])
      regionZones = filter(regionZones, regionZone => includes(zones.value, regionZone.name))
      const unavailableVolumeTypes = map(regionZones, zone => zone.unavailableVolumeTypes)
      const unavailableVolumeTypesInAllZones = intersection(...unavailableVolumeTypes)

      return filter(items, item => {
        if (item.usable === false) {
          return false
        }
        if (includes(unavailableVolumeTypesInAllZones, item.name)) {
          return false
        }
        return true
      })
    })
  }

  /**
   * Get minimum volume size for machine type and volume type combination
   * @param {Ref<Object>} machineType - Vue ref containing machine type object
   * @param {Ref<Object>} volumeType - Vue ref containing volume type object
   * @returns {ComputedRef<String>} Computed ref of minimum size (e.g. "20Gi")
   */
  function useMinimumVolumeSize (machineType, volumeType) {
    if (!isRef(machineType)) {
      throw new Error('machineType must be a ref!')
    }
    if (!isRef(volumeType)) {
      throw new Error('volumeType must be a ref!')
    }

    return computed(() => {
      if (volumeType.value?.name) {
        return volumeType.value.minSize ?? '0Gi'
      }

      if (machineType.value?.storage) {
        return machineType.value.storage.minSize ?? '0Gi'
      }

      return '0Gi'
    })
  }

  return {
    volumeTypes,
    useFilteredVolumeTypes,
    useMinimumVolumeSize,
  }
}
