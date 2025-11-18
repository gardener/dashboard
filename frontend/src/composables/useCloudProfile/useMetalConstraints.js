//
// SPDX-FileCopyrightText: 2025 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  computed,
  isRef,
} from 'vue'

import { useMachineTypes } from '@/composables/useCloudProfile/useMachineTypes'

import get from 'lodash/get'
import map from 'lodash/map'
import toPairs from 'lodash/toPairs'

/**
 * Composable for managing Metal-specific constraints from a cloud profile.
 * Provides functions for working with partition IDs, firewall sizes, firewall images,
 * and firewall networks specific to Metal infrastructure.
 *
 * @param {Ref<object>} cloudProfile - A Vue ref containing the cloud profile object
 * @param {Function} useZones - Function to get zones by cloud profile and region
 * @throws {Error} If cloudProfile is not a ref
 */
export function useMetalConstraints (cloudProfile, useZones) {
  if (!isRef(cloudProfile)) {
    throw new Error('cloudProfile must be a ref!')
  }

  const { useFilteredMachineTypes } = useMachineTypes(cloudProfile, useZones)

  /**
   * Returns partition IDs for a given region.
   * For Metal infrastructure, partition IDs equal zones.
   *
   * @param {Ref<string>} region - A Vue ref containing the region
   * @returns {ComputedRef<Array<string>|undefined>} Computed ref with partition IDs, or undefined if not Metal infrastructure
   * @throws {Error} If region is not a ref
   */
  function usePartitionIDs (region) {
    if (!isRef(region)) {
      throw new Error('region must be a ref!')
    }

    if (get(cloudProfile.value, ['spec', 'type']) !== 'metal') {
      return undefinedComputed
    }
    return useZones(region)
  }

  const undefinedComputed = computed(() => undefined)

  /**
   * Returns firewall sizes for a given region.
   * For Metal infrastructure, firewall sizes equal machine types for the cloud provider.
   *
   * @param {Ref<string>} region - A Vue ref containing the region
   * @returns {ComputedRef<Array|undefined>} Computed ref with firewall sizes, or undefined if not Metal infrastructure
   * @throws {Error} If region is not a ref
   */
  function useFirewallSizes (region) {
    if (!isRef(region)) {
      throw new Error('region must be a ref!')
    }

    if (get(cloudProfile.value, ['spec', 'type']) !== 'metal') {
      return undefinedComputed
    }

    return useFilteredMachineTypes(region, undefinedComputed)
  }

  const firewallImages = computed(() => {
    return get(cloudProfile.value, ['spec', 'providerConfig', 'firewallImages'])
  })

  /**
   * Returns firewall networks for a given partition ID.
   *
   * @param {Ref<string>} partitionID - A Vue ref containing the partition ID
   * @returns {ComputedRef<Array>} Computed ref with firewall networks formatted as objects with key, value, and text properties
   * @throws {Error} If partitionID is not a ref
   */
  function useFirewallNetworks (partitionID) {
    if (!isRef(partitionID)) {
      throw new Error('partitionID must be a ref!')
    }

    return computed(() => {
      const networks = get(cloudProfile.value, ['spec', 'providerConfig', 'firewallNetworks', partitionID.value])
      return map(toPairs(networks), ([key, value]) => {
        return {
          key,
          value,
          text: `${key} [${value}]`,
        }
      })
    })
  }

  return {
    usePartitionIDs,
    useFirewallSizes,
    firewallImages,
    useFirewallNetworks,
  }
}
