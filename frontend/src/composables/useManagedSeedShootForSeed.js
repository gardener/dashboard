//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  computed,
  inject,
  isRef,
  provide,
} from 'vue'

import { useManagedSeedStore } from '@/store/managedSeed'
import { useManagedSeedShootStore } from '@/store/managedSeedShoot'

import { useShootAdvertisedAddresses } from '@/composables/useShootAdvertisedAddresses'

import get from 'lodash/get'

export function createManagedSeedShootComposable (seedName) {
  if (!isRef(seedName)) {
    throw new TypeError('First argument `seedName` must be a ref object')
  }

  const managedSeedStore = useManagedSeedStore()
  const managedSeedShootStore = useManagedSeedShootStore()

  const managedSeedShootName = computed(() => {
    return managedSeedStore.shootNameForSeed(seedName.value)
  })

  const managedSeedShoot = computed(() => {
    if (!managedSeedShootName.value) {
      return undefined
    }

    return managedSeedShootStore.shootByName('garden', managedSeedShootName.value)
  })

  const managedSeedShootConditions = computed(() => {
    return get(managedSeedShoot.value, ['status', 'conditions'])
  })

  const {
    shootPlutonoUrl: managedSeedShootPlutonoUrl,
    shootPrometheusUrl: managedSeedShootPrometheusUrl,
  } = useShootAdvertisedAddresses(managedSeedShoot)

  return {
    managedSeedShootName,
    managedSeedShoot,
    managedSeedShootConditions,
    managedSeedShootPlutonoUrl,
    managedSeedShootPrometheusUrl,
  }
}

export function useManagedSeedShoot () {
  const composable = inject('managed-seed-shoot', null)
  if (!composable) {
    throw new Error('Managed seed shoot composable has not been provided')
  }

  return composable
}

export function useProvideManagedSeedShoot (seedName) {
  const composable = createManagedSeedShootComposable(seedName)
  provide('managed-seed-shoot', composable)
  return composable
}
