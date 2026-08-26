//
// SPDX-FileCopyrightText: Copyright Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  computed,
  isRef,
  ref,
} from 'vue'

export function useSeedEffectiveConditions (seedConditions, managedSeedShootConditions = ref(undefined)) {
  if (!isRef(seedConditions)) {
    throw new TypeError('First argument `seedConditions` must be a ref object')
  }

  if (!isRef(managedSeedShootConditions)) {
    throw new TypeError('Second argument `managedSeedShootConditions` must be a ref object')
  }

  return computed(() => {
    if (managedSeedShootConditions.value !== undefined) {
      return managedSeedShootConditions.value
    }

    return seedConditions.value
  })
}
