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
