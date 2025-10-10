//
// SPDX-FileCopyrightText: 2025 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  computed,
  isRef,
} from 'vue'

import filter from 'lodash/filter'
import map from 'lodash/map'
import get from 'lodash/get'
import includes from 'lodash/includes'
import intersection from 'lodash/intersection'
import find from 'lodash/find'
import uniq from 'lodash/uniq'

/**
 * @typedef {import('vue').ComputedRef} ComputedRef
 * @typedef {import('vue').Ref} Ref
 */

/**
 * Composable for managing machine type information from a cloud profile.
 * Provides functionality for filtering machine types by region, zone availability,
 * and architecture.
 *
 * @param {Ref<object>} cloudProfile - A Vue ref containing the cloud profile object
 * @param {Function} zonesByCloudProfileAndRegion - Function to get zones for a region
 * @throws {Error} If cloudProfile is not a ref
 */
export function useCloudProfileForMachineTypes (cloudProfile, zonesByCloudProfileAndRegion) {
  if (!isRef(cloudProfile)) {
    throw new Error('cloudProfile must be a ref!')
  }

  /**
   * Internal function to filter machine types by region and zone availability.
   * Filters out machine types that are unavailable in all zones of a region.
   *
   * @param {Ref<string>} region - Optional Vue ref containing the region name
   * @returns {ComputedRef<Array>} Computed ref with filtered machine types
   */
  function machineTypesByRegion (region) {
    return computed(() => {
      if (!isRef(region)) {
        throw new Error('region must be a ref!')
      }

      const machineAndVolumeTypePredicate = unavailableItems => {
        return item => {
          if (item.usable === false) {
            return false
          }
          if (includes(unavailableItems, item.name)) {
            return false
          }
          return true
        }
      }

      const items = get(cloudProfile.value, ['spec', 'machineTypes'], [])
      if (!region.value) {
        return items
      }

      const zones = zonesByCloudProfileAndRegion({ cloudProfile: cloudProfile.value, region: region.value })
      const regionObject = find(cloudProfile.value?.spec.regions, { name: region.value })
      let regionZones = get(regionObject, ['zones'], [])
      regionZones = filter(regionZones, regionZone => includes(zones, regionZone.name))
      const unavailableItems = map(regionZones, zone => zone.unavailableMachineTypes)
      const unavailableItemsInAllZones = intersection(...unavailableItems)

      return filter(items, machineAndVolumeTypePredicate(unavailableItemsInAllZones))
    })
  }

  /**
   * Returns all machine types from the cloud profile.
   */
  const machineTypes = computed(() => {
    const regionRef = computed(() => undefined)
    return machineTypesByRegion(regionRef).value
  })

  /**
   * Returns machine types filtered by region and architecture.
   * Adds default 'amd64' architecture if not specified in the machine type.
   *
   * @param {Ref<string>} region - A Vue ref containing the region name
   * @param {Ref<string>} architecture - A Vue ref containing the architecture (e.g., 'amd64', 'arm64')
   * @returns {ComputedRef<Array>} Computed ref with filtered and decorated machine types
   * @throws {Error} If region or architecture are not refs
   */
  function machineTypesByRegionAndArchitecture (region, architecture) {
    return computed(() => {
      if (!isRef(region) || !isRef(architecture)) {
        throw new Error('region and architecture must be refs!')
      }

      let types = machineTypesByRegion(region).value
      types = map(types, item => {
        const machineType = { ...item }
        machineType.architecture ??= 'amd64' // default if not maintained
        return machineType
      })

      if (architecture.value) {
        return filter(types, { architecture: architecture.value })
      }

      return types
    })
  }

  /**
   * Returns available architectures for machine types in a region.
   * Extracts unique architectures from machine types available in the specified region.
   *
   * @param {Ref<string>} region - A Vue ref containing the region name
   * @returns {ComputedRef<Array<string>>} Computed ref with sorted array of architecture strings
   * @throws {Error} If region is not a ref
   */
  function machineArchitecturesByRegion (region) {
    return computed(() => {
      if (!isRef(region)) {
        throw new Error('region must be a ref!')
      }

      const types = machineTypesByRegion(region).value
      const architectures = uniq(map(types, 'architecture'))
      return architectures.sort()
    })
  }

  return {
    machineTypes,
    machineTypesByRegion,
    machineTypesByRegionAndArchitecture,
    machineArchitecturesByRegion,
  }
}
