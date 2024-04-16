//
// SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  computed,
  toRef,
  unref,
  isProxy,
  isRef,
} from 'vue'

import { useCloudProfileStore } from '@/store/cloudProfile'
import { useConfigStore } from '@/store/config'
import { useGardenerExtensionStore } from '@/store/gardenerExtension'
import { useSecretStore } from '@/store/secret'
import { useSeedStore } from '@/store/seed'

import utils from '@/utils'
import { findFreeNetworks } from '@/utils/createShoot'

import {
  get,
  map,
  keyBy,
  flatMap,
  mapValues,
  difference,
  find,
  some,
  uniq,
  isEmpty,
  size,
} from '@/lodash'

const shootPropertyMappings = Object.freeze({
  creationTimestamp: 'metadata.creationTimestamp',
  cloudProfileName: 'spec.cloudProfileName',
  seedName: 'spec.seedName',
  region: 'spec.region',
  secretBindingName: 'spec.secretBindingName',
  kubernetesVersion: 'spec.kubernetes.version',
  networkingNodes: 'spec.networking.nodes',
  providerType: 'spec.provider.type',
  providerWorkers: 'spec.provider.workers',
  providerInfrastructureConfigPartitionID: 'spec.provider.infrastructureConfig.partitionID',
  providerInfrastructureConfigNetworksZones: 'spec.provider.infrastructureConfig.networks.zones',
})

function toShootProperties (state) {
  if (isRef(state)) {
    return args => Array.isArray(args)
      ? computed(() => get(state.value, ...args))
      : computed(() => get(state.value, args))
  }
  if (isProxy(state)) {
    return (path, key) => toRef(state, key)
  }
  throw new TypeError('State must be a Proxy or Ref')
}

export function useShootHelper (state, options = {}) {
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
    networkingNodes,
    providerType,
    providerWorkers,
    providerInfrastructureConfigPartitionID,
    providerInfrastructureConfigNetworksZones,
  } = mapValues(shootPropertyMappings, toShootProperties(state))

  const isNewCluster = computed(() => {
    return !creationTimestamp.value
  })

  const infrastructureSecret = computed(() => {
    return find(infrastructureSecrets.value, ['metadata.name', secretBindingName.value])
  })

  const cloudProfiles = computed(() => {
    return cloudProfileStore.cloudProfilesByCloudProviderKind(providerType.value)
  })

  const cloudProfile = computed(() => {
    return cloudProfileStore.cloudProfileByName(cloudProfileName.value)
  })

  const isZonedCluster = computed(() => {
    return utils.isZonedCluster({
      cloudProviderKind: providerType.value,
      isNewCluster: isNewCluster.value,
    })
  })

  const seed = computed(() => {
    return seedStore.seedByName(seedName.value)
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

  const usedZones = computed(() => {
    return uniq(flatMap(providerWorkers.value, 'zones'))
  })

  const unusedZones = computed(() => {
    return difference(allZones.value, usedZones.value)
  })

  const workerCIDR = computed(() => {
    return networkingNodes.value ?? defaultNodesCIDR.value
  })

  const freeNetworks = computed(() => {
    return findFreeNetworks(
      providerInfrastructureConfigNetworksZones.value,
      workerCIDR.value,
      providerType.value,
      size(allZones.value),
    )
  })

  const zonesWithNetworkConfigInShoot = computed(() => {
    return map(providerInfrastructureConfigNetworksZones.value, 'name')
  })

  const availableZones = computed(() => {
    if (!isZonedCluster.value) {
      return []
    }
    if (isNewCluster.value) {
      return allZones.value
    }
    // Ensure that only zones can be selected, that have a network config in providerConfig (if required)
    // or that free networks are available to select more zones
    const isZonesNetworkConfigurationRequired = !isEmpty(zonesWithNetworkConfigInShoot.value)
    if (!isZonesNetworkConfigurationRequired) {
      return allZones.value
    }

    if (size(freeNetworks.value)) {
      return allZones.value
    }

    return zonesWithNetworkConfigInShoot.value
  })

  const maxAdditionalZones = computed(() => {
    const NO_LIMIT = -1
    if (isNewCluster.value) {
      return NO_LIMIT
    }
    const isZonesNetworkConfigurationRequired = !isEmpty(zonesWithNetworkConfigInShoot.value)
    if (!isZonesNetworkConfigurationRequired) {
      return NO_LIMIT
    }
    const numberOfFreeNetworks = size(freeNetworks.value)
    const hasFreeNetworks = numberOfFreeNetworks >= size(unusedZones)
    if (hasFreeNetworks) {
      return NO_LIMIT
    }
    return numberOfFreeNetworks
  })

  const expiringWorkerGroups = computed(() => {
    return cloudProfileStore.expiringWorkerGroupsForShoot(providerWorkers.value, cloudProfileName.value, false)
  })

  const regionsWithSeed = computed(() => {
    return cloudProfileStore.regionsWithSeedByCloudProfileName(cloudProfileName.value)
  })

  const regionsWithoutSeed = computed(() => {
    return cloudProfileStore.regionsWithoutSeedByCloudProfileName(cloudProfileName.value)
  })

  const defaultNodesCIDR = computed(() => {
    return cloudProfileStore.getDefaultNodesCIDR({
      cloudProfileName: cloudProfileName.value,
    })
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

  const allFirewallNetworks = computed(() => {
    return cloudProfileStore.firewallNetworksByCloudProfileNameAndPartitionId({
      cloudProfileName: cloudProfileName.value,
      partitionID: providerInfrastructureConfigPartitionID.value,
    })
  })

  const allFloatingPoolNames = computed(() => {
    return cloudProfileStore.floatingPoolNamesByCloudProfileNameAndRegionAndDomain({
      cloudProfileName: cloudProfileName.value,
      region: region.value,
      secretDomain: get(infrastructureSecret.value, 'data.domainName'),
    })
  })

  const accessRestrictionDefinitionList = computed(() => {
    return cloudProfileStore.accessRestrictionDefinitionsByCloudProfileNameAndRegion({
      cloudProfileName: cloudProfileName.value,
      region: region.value,
    })
  })

  const accessRestrictionDefinitions = computed(() => {
    const accessRestrictionDefinitions = {}
    for (const definition of accessRestrictionDefinitionList.value) {
      const { key, options } = definition
      accessRestrictionDefinitions[key] = {
        ...definition,
        options: keyBy(options, 'key'),
      }
    }
    return accessRestrictionDefinitions
  })

  const accessRestrictionOptionDefinitions = computed(() => {
    const accessRestrictionOptionDefinitions = {}
    for (const definition of accessRestrictionDefinitionList.value) {
      for (const optionDefinition of definition.options) {
        accessRestrictionOptionDefinitions[optionDefinition.key] = {
          accessRestrictionKey: definition.key,
          ...optionDefinition,
        }
      }
    }
    return accessRestrictionOptionDefinitions
  })

  const accessRestrictionNoItemsText = computed(() => {
    return cloudProfileStore.accessRestrictionNoItemsTextForCloudProfileNameAndRegion({
      cloudProfileName: cloudProfileName.value,
      region: region.value,
    })
  })

  const allMachineTypes = computed(() => {
    return cloudProfileStore.machineTypesByCloudProfileName({
      cloudProfileName: cloudProfileName.value,
    })
  })

  const machineArchitectures = computed(() => {
    return cloudProfileStore.machineArchitecturesByCloudProfileNameAndRegion({
      cloudProfileName: cloudProfileName.value,
      region: region.value,
    })
  })

  const volumeTypes = computed(() => {
    return cloudProfileStore.volumeTypesByCloudProfileName({
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

  return {
    isNewCluster,
    cloudProfiles,
    cloudProfile,
    isZonedCluster,
    seed,
    seeds,
    isFailureToleranceTypeZoneSupported,
    allZones,
    usedZones,
    unusedZones,
    availableZones,
    maxAdditionalZones,
    expiringWorkerGroups,
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
    allFirewallNetworks,
    allFloatingPoolNames,
    accessRestrictionDefinitionList,
    accessRestrictionDefinitions,
    accessRestrictionOptionDefinitions,
    accessRestrictionNoItemsText,
    allMachineTypes,
    machineArchitectures,
    volumeTypes,
    machineImages,
    networkingTypes,
    showAllRegions,
  }
}
