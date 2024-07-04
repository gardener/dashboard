//
// SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  computed,
  inject,
  provide,
} from 'vue'

import { useCloudProfileStore } from '@/store/cloudProfile'
import { useConfigStore } from '@/store/config'
import { useGardenerExtensionStore } from '@/store/gardenerExtension'
import { useSecretStore } from '@/store/secret'
import { useSeedStore } from '@/store/seed'

import utils from '@/utils'

import { useShootAccessRestrictions } from './useShootAccessRestrictions'

import {
  get,
  map,
  head,
  mapValues,
  find,
  some,
} from '@/lodash'

const shootPropertyMappings = Object.freeze({
  creationTimestamp: 'metadata.creationTimestamp',
  cloudProfileName: 'spec.cloudProfileName',
  seedName: 'spec.seedName',
  region: 'spec.region',
  secretBindingName: 'spec.secretBindingName',
  kubernetesVersion: 'spec.kubernetes.version',
  providerType: 'spec.provider.type',
})

export function createShootHelperComposable (shootItem, options = {}) {
  const {
    cloudProfileStore = useCloudProfileStore(),
    configStore = useConfigStore(),
    gardenerExtensionStore = useGardenerExtensionStore(),
    secretStore = useSecretStore(),
    seedStore = useSeedStore(),
  } = options

  const {
    creationTimestamp,
    cloudProfileName,
    seedName,
    region,
    secretBindingName,
    kubernetesVersion,
    providerType,
  } = mapValues(shootPropertyMappings, path => {
    return computed(() => get(shootItem.value, path))
  })

  const infrastructureSecret = computed(() => {
    return find(infrastructureSecrets.value, ['metadata.name', secretBindingName.value])
  })

  const cloudProfiles = computed(() => {
    return cloudProfileStore.cloudProfilesByCloudProviderKind(providerType.value)
  })

  const defaultCloudProfileName = computed(() => {
    const defaultCloudProfile = head(cloudProfiles.value)
    return get(defaultCloudProfile, 'metadata.name')
  })

  const cloudProfile = computed(() => {
    return cloudProfileStore.cloudProfileByName(cloudProfileName.value)
  })

  const isZonedCluster = computed(() => {
    return utils.isZonedCluster({
      cloudProviderKind: providerType.value,
      isNewCluster: !creationTimestamp.value,
    })
  })

  const seed = computed(() => {
    return seedStore.seedByName(seedName.value)
  })

  const seedIngressDomain = computed(() => {
    return get(seed.value, 'data.ingressDomain')
  })

  const seeds = computed(() => {
    return cloudProfileStore.seedsByCloudProfileName(cloudProfileName.value)
  })

  const isFailureToleranceTypeZoneSupported = computed(() => {
    const seedList = seedName.value
      ? [seed.value]
      : seeds.value
    return some(seedList, ({ data }) => data.zones?.length >= 3)
  })

  const allZones = computed(() => {
    return cloudProfileStore.zonesByCloudProfileNameAndRegion({
      cloudProfileName: cloudProfileName.value,
      region: region.value,
    })
  })

  const regionsWithSeed = computed(() => {
    return cloudProfileStore.regionsWithSeedByCloudProfileName(cloudProfileName.value)
  })

  const regionsWithoutSeed = computed(() => {
    return cloudProfileStore.regionsWithoutSeedByCloudProfileName(cloudProfileName.value)
  })

  const defaultNodesCIDR = computed(() => {
    return cloudProfileStore.getDefaultNodesCIDR(cloudProfileName.value)
  })

  const infrastructureSecrets = computed(() => {
    return secretStore.infrastructureSecretsByCloudProfileName(cloudProfileName.value)
  })

  const sortedKubernetesVersions = computed(() => {
    return cloudProfileStore.sortedKubernetesVersions(cloudProfileName.value)
  })

  const kubernetesVersionIsNotLatestPatch = computed(() => {
    return cloudProfileStore.kubernetesVersionIsNotLatestPatch(kubernetesVersion.value, cloudProfileName.value)
  })

  const allPurposes = computed(() => {
    return utils.purposesForSecret(infrastructureSecret.value)
  })

  const allLoadBalancerProviderNames = computed(() => {
    return cloudProfileStore.loadBalancerProviderNamesByCloudProfileNameAndRegion({
      cloudProfileName: cloudProfileName.value,
      region: region.value,
    })
  })

  const allLoadBalancerClassNames = computed(() => {
    return cloudProfileStore.loadBalancerClassNamesByCloudProfileName(cloudProfileName.value)
  })

  const partitionIDs = computed(() => {
    return cloudProfileStore.partitionIDsByCloudProfileNameAndRegion({
      cloudProfileName: cloudProfileName.value,
      region: region.value,
    })
  })

  const firewallImages = computed(() => {
    return cloudProfileStore.firewallImagesByCloudProfileName(cloudProfileName.value)
  })

  const firewallSizes = computed(() => {
    const firewallSizes = cloudProfileStore.firewallSizesByCloudProfileNameAndRegion({
      cloudProfileName: cloudProfileName.value,
      region: region.value,
    })
    return map(firewallSizes, 'name')
  })

  const allFloatingPoolNames = computed(() => {
    return cloudProfileStore.floatingPoolNamesByCloudProfileNameAndRegionAndDomain({
      cloudProfileName: cloudProfileName.value,
      region: region.value,
      secretDomain: get(infrastructureSecret.value, 'data.domainName'),
    })
  })

  const allMachineTypes = computed(() => {
    return cloudProfileStore.machineTypesByCloudProfileName(cloudProfileName.value)
  })

  const machineArchitectures = computed(() => {
    return cloudProfileStore.machineArchitecturesByCloudProfileNameAndRegion({
      cloudProfileName: cloudProfileName.value,
      region: region.value,
    })
  })

  const allVolumeTypes = computed(() => {
    return cloudProfileStore.volumeTypesByCloudProfileName(cloudProfileName.value)
  })

  const volumeTypes = computed(() => {
    return cloudProfileStore.volumeTypesByCloudProfileNameAndRegion({
      cloudProfileName: cloudProfileName.value,
      region: region.value,
    })
  })

  const machineImages = computed(() => {
    return cloudProfileStore.machineImagesByCloudProfileName(cloudProfileName.value)
  })

  const networkingTypes = computed(() => {
    return gardenerExtensionStore.networkingTypes
  })

  const showAllRegions = computed(() => {
    return configStore.seedCandidateDeterminationStrategy !== 'SameRegion'
  })

  const {
    accessRestrictionDefinitionList,
    accessRestrictionDefinitions,
    accessRestrictionOptionDefinitions,
    accessRestrictionNoItemsText,
  } = useShootAccessRestrictions(shootItem, {
    cloudProfileStore,
  })

  return {
    cloudProfiles,
    defaultCloudProfileName,
    cloudProfile,
    isZonedCluster,
    seed,
    seedIngressDomain,
    seeds,
    isFailureToleranceTypeZoneSupported,
    allZones,
    defaultNodesCIDR,
    infrastructureSecrets,
    infrastructureSecret,
    sortedKubernetesVersions,
    kubernetesVersionIsNotLatestPatch,
    allPurposes,
    regionsWithSeed,
    regionsWithoutSeed,
    allLoadBalancerProviderNames,
    allLoadBalancerClassNames,
    partitionIDs,
    firewallImages,
    firewallSizes,
    allFloatingPoolNames,
    accessRestrictionDefinitionList,
    accessRestrictionDefinitions,
    accessRestrictionOptionDefinitions,
    accessRestrictionNoItemsText,
    allMachineTypes,
    machineArchitectures,
    allVolumeTypes,
    volumeTypes,
    machineImages,
    networkingTypes,
    showAllRegions,
  }
}

export function useShootHelper () {
  return inject('shoot-helper', null)
}

export function useProvideShootHelper (shootItem, options) {
  const composable = createShootHelperComposable(shootItem, options)
  provide('shoot-helper', composable)
  return composable
}
