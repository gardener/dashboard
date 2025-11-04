//
// SPDX-FileCopyrightText: 2025 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  computed,
  isRef,
} from 'vue'

import { useCloudProfileForRegions } from './useCloudProfileForRegions'

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
export function useCloudProfileForVolumeTypes (cloudProfile) {
  if (!isRef(cloudProfile)) {
    throw new Error('cloudProfile must be a ref!')
  }

  const { zonesByRegion } = useCloudProfileForRegions(cloudProfile)

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
  function volumeTypesByRegion (region) {
    return computed(() => {
      if (!isRef(region)) {
        throw new Error('region must be a ref!')
      }

      if (!cloudProfile.value) {
        return []
      }

      const items = volumeTypes.value
      if (!region.value) {
        return items
      }

      const zones = zonesByRegion(region).value

      const regionObject = find(
        get(cloudProfile.value, ['spec', 'regions'], []),
        { name: region.value },
      )
      let regionZones = get(regionObject, ['zones'], [])
      regionZones = filter(regionZones, regionZone => includes(zones, regionZone.name))
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
  function minimumVolumeSize (machineType, volumeType) {
    return computed(() => {
      if (!isRef(machineType)) {
        throw new Error('machineType must be a ref!')
      }
      if (!isRef(volumeType)) {
        throw new Error('volumeType must be a ref!')
      }

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
    volumeTypesByRegion,
    minimumVolumeSize,
  }
}
