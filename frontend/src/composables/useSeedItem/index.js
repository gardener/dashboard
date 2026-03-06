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

import {
  getBestSupportedFailureToleranceType,
  isFailureToleranceTypeZoneSupported,
} from './helper'

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
  const seedProviderType = useSeedProviderType(seedItem)
  const seedProviderRegion = useSeedProviderRegion(seedItem)
  const seedProviderZones = useSeedProviderZones(seedItem)
  const seedIsFailureToleranceTypeZoneSupported = useSeedIsFailureToleranceTypeZoneSupported(seedItem)
  const seedSupportedFailureToleranceTypes = useSeedSupportedFailureToleranceTypes(seedItem)
  const seedBestSupportedFailureToleranceType = useSeedBestSupportedFailureToleranceType(seedItem)
  const seedAccessRestrictions = useSeedAccessRestrictions(seedItem)
  const seedSchedulingVisible = useSeedSchedulingVisible(seedItem)
  const seedNetworksNodes = useSeedNetworksNodes(seedItem)
  const seedNetworksPods = useSeedNetworksPods(seedItem)
  const seedNetworksServices = useSeedNetworksServices(seedItem)
  const seedIngressDomain = useSeedIngressDomain(seedItem)
  const seedNetworksShootDefaultsPods = useSeedNetworksShootDefaultsPods(seedItem)
  const seedNetworksShootDefaultsServices = useSeedNetworksShootDefaultsServices(seedItem)
  const seedNetworksBlockCIDRs = useSeedNetworksBlockCIDRs(seedItem)

  /* status */
  const seedConditions = useSeedConditions(seedItem)
  const seedKubernetesVersion = useSeedKubernetesVersion(seedItem)
  const seedGardenerVersion = useSeedGardenerVersion(seedItem)
  const seedAllocatableShoots = useSeedAllocatableShoots(seedItem)
  const seedLastOperation = useSeedLastOperation(seedItem)

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
    seedProviderType,
    seedProviderRegion,
    seedProviderZones,
    seedIsFailureToleranceTypeZoneSupported,
    seedSupportedFailureToleranceTypes,
    seedBestSupportedFailureToleranceType,
    seedAccessRestrictions,
    seedSchedulingVisible,
    seedNetworksNodes,
    seedNetworksPods,
    seedNetworksServices,
    seedIngressDomain,
    seedNetworksShootDefaultsPods,
    seedNetworksShootDefaultsServices,
    seedNetworksBlockCIDRs,
    /* status */
    seedConditions,
    seedKubernetesVersion,
    seedGardenerVersion,
    seedAllocatableShoots,
    seedLastOperation,
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

export function useSeedProviderRegion (seedItem) {
  return computed(() => {
    return get(seedItem.value, ['spec', 'provider', 'region'])
  })
}

export function useSeedProviderZones (seedItem) {
  return computed(() => {
    return get(seedItem.value, ['spec', 'provider', 'zones'], [])
  })
}

export function useSeedIsFailureToleranceTypeZoneSupported (seedItem) {
  return computed(() => {
    return isFailureToleranceTypeZoneSupported(seedItem.value)
  })
}

export function useSeedSupportedFailureToleranceTypes (seedItem) {
  return computed(() => {
    const supportedFailureToleranceTypes = ['node']
    if (isFailureToleranceTypeZoneSupported(seedItem.value)) {
      supportedFailureToleranceTypes.push('zone')
    }
    return supportedFailureToleranceTypes
  })
}

export function useSeedBestSupportedFailureToleranceType (seedItem) {
  return computed(() => {
    return getBestSupportedFailureToleranceType(seedItem.value)
  })
}

export function useSeedAccessRestrictions (seedItem) {
  return computed(() => {
    const accessRestrictions = get(seedItem.value, ['spec', 'accessRestrictions'], [])

    return accessRestrictions
      .map(({ name }, index) => {
        if (!name) {
          return null
        }

        return {
          key: `${name}-${index}`,
          title: name,
          options: [],
        }
      })
      .filter(Boolean)
  })
}

export function useSeedSchedulingVisible (seedItem) {
  return computed(() => {
    return get(seedItem.value, ['spec', 'settings', 'scheduling', 'visible'], false)
  })
}

export function useSeedNetworksNodes (seedItem) {
  return computed(() => {
    return get(seedItem.value, ['spec', 'networks', 'nodes'])
  })
}

export function useSeedNetworksPods (seedItem) {
  return computed(() => {
    return get(seedItem.value, ['spec', 'networks', 'pods'])
  })
}

export function useSeedNetworksServices (seedItem) {
  return computed(() => {
    return get(seedItem.value, ['spec', 'networks', 'services'])
  })
}

export function useSeedIngressDomain (seedItem) {
  return computed(() => {
    return get(seedItem.value, ['spec', 'ingress', 'domain'])
  })
}

export function useSeedNetworksShootDefaultsPods (seedItem) {
  return computed(() => {
    return get(seedItem.value, ['spec', 'networks', 'shootDefaults', 'pods'])
  })
}

export function useSeedNetworksShootDefaultsServices (seedItem) {
  return computed(() => {
    return get(seedItem.value, ['spec', 'networks', 'shootDefaults', 'services'])
  })
}

export function useSeedNetworksBlockCIDRs (seedItem) {
  return computed(() => {
    return get(seedItem.value, ['spec', 'networks', 'blockCIDRs'])
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

export function useSeedGardenerVersion (seedItem) {
  return computed(() => {
    return get(seedItem.value, ['status', 'gardener', 'version'])
  })
}

export function useSeedAllocatableShoots (seedItem) {
  return computed(() => {
    return get(seedItem.value, ['status', 'allocatable', 'shoots'])
  })
}

export function useSeedLastOperation (seedItem) {
  return computed(() => {
    return get(seedItem.value, ['status', 'lastOperation'], {})
  })
}
