//
// SPDX-FileCopyrightText: 2025 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  computed,
  isRef,
  inject,
  provide,
} from 'vue'

import { useSeedMetadata } from '@/composables/useSeedMetadata'

import get from 'lodash/get'

export function createSeedItemComposable (seedItem) {
  if (!isRef(seedItem)) {
    throw new TypeError('First argument `seedItem` must be a ref object')
  }

  const {
    seedMetadata,
    seedName,
    seedCreationTimestamp,
    seedDeletionTimestamp,
    seedGeneration,
    seedUid,
    seedAnnotations,
    getSeedAnnotation,
    setSeedAnnotation,
    unsetSeedAnnotation,
    seedLabels,
    getSeedLabel,
    setSeedLabel,
    unsetSeedLabel,
    seedCreatedAt,
    isNewSeed,
  } = useSeedMetadata(seedItem)

  /* spec */
  const seedOwner = computed(() => {
    return get(seedItem.value, ['spec', 'owner', 'name'], '')
  })
  const seedDescription = computed(() => {
    return get(seedItem.value, ['spec', 'description'], '')
  })
  const seedPurpose = computed(() => {
    return get(seedItem.value, ['spec', 'purpose'], '')
  })
  const seedProviderType = useSeedProviderType(seedItem)

  /* status */
  const seedConditions = useSeedConditions(seedItem)
  const seedKubernetesVersion = useSeedKubernetesVersion(seedItem)
  const seedAllocatableShoots = useSeedAllocatableShoots(seedItem)
  const seedCapacityShoots = useSeedCapacityShoots(seedItem)

  return {
    seedItem,
    /* metadata */
    seedMetadata,
    seedName,
    seedCreationTimestamp,
    seedDeletionTimestamp,
    seedGeneration,
    seedUid,
    seedAnnotations,
    getSeedAnnotation,
    setSeedAnnotation,
    unsetSeedAnnotation,
    seedLabels,
    getSeedLabel,
    setSeedLabel,
    unsetSeedLabel,
    seedCreatedAt,
    /* spec */
    isNewSeed,
    seedOwner,
    seedDescription,
    seedPurpose,
    seedProviderType,
    /* status */
    seedConditions,
    seedKubernetesVersion,
    seedAllocatableShoots,
    seedCapacityShoots,
  }
}

export function useSeedItem () {
  return inject('seed-item', null)
}

export function useProvideSeedItem (seedItem) {
  const composable = createSeedItemComposable(seedItem)
  provide('seed-item', composable)
  return composable
}

/* spec */
export function useSeedProviderType (seedItem) {
  return computed(() => {
    return get(seedItem.value, ['spec', 'provider', 'type'])
  })
}

/* status */
export function useSeedConditions (seedItem) {
  return computed(() => {
    return get(seedItem.value, ['status', 'conditions'])
  })
}

export function useSeedKubernetesVersion (seedItem) {
  return computed(() => {
    return get(seedItem.value, ['status', 'kubernetesVersion'])
  })
}

export function useSeedAllocatableShoots (seedItem) {
  return computed(() => {
    return get(seedItem.value, ['status', 'allocatable', 'shoots'])
  })
}

export function useSeedCapacityShoots (seedItem) {
  return computed(() => {
    return get(seedItem.value, ['status', 'capacity', 'shoots'])
  })
}
