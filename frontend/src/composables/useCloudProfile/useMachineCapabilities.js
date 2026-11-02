//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  computed,
  isRef,
} from 'vue'

import get from 'lodash/get'

/**
 * @typedef {import('vue').ComputedRef} ComputedRef
 * @typedef {import('vue').Ref} Ref
 */

/**
 * Resolves the effective architectures for a machine type using a
 * three-level priority chain:
 *   1. Explicit `capabilities.architecture` on the machine type
 *   2. Profile-level defaults from `spec.machineCapabilities`
 *   3. Deprecated `type.architecture` field
 *
 * @param {object} machineType - The machine type object
 * @param {object} machineCapabilities - Resolved profile-level machine capabilities (name → values map)
 * @returns {string[]} Array of architecture strings, may be empty
 */
export function resolveArchitectures (machineType, machineCapabilities) {
  const capabilityArchitectures = machineType?.capabilities?.architecture
  if (capabilityArchitectures?.length) {
    return capabilityArchitectures
  }
  const defaultArchitectures = machineCapabilities?.architecture
  if (defaultArchitectures?.length) {
    return defaultArchitectures
  }
  if (machineType?.architecture) {
    return [machineType.architecture]
  }
  return []
}

/**
 * Composable for managing machine capabilities information from a cloud profile.
 *
 * @param {Ref<object>} cloudProfile - A Vue ref containing the cloud profile object
 * @throws {Error} If cloudProfile is not a ref
 */
export function useMachineCapabilities (cloudProfile) {
  if (!isRef(cloudProfile)) {
    throw new Error('cloudProfile must be a ref!')
  }

  const machineCapabilities = computed(() =>
    Object.fromEntries(
      get(cloudProfile.value, ['spec', 'machineCapabilities'], [])
        .map(item => [item.name, item.values]),
    ),
  )
  return machineCapabilities
}
