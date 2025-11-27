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
import { useCredentialStore } from '@/store/credential'
import { useSeedStore } from '@/store/seed'
import { useProjectStore } from '@/store/project'

import { useCloudProviderEntityList } from '@/composables/credential/useCloudProviderEntityList'
import { useCloudProviderBinding } from '@/composables/credential/useCloudProviderBinding'

import { useShootAccessRestrictions } from './useShootAccessRestrictions'

import some from 'lodash/some'
import find from 'lodash/find'
import mapValues from 'lodash/mapValues'
import head from 'lodash/head'
import map from 'lodash/map'
import get from 'lodash/get'

const shootPropertyMappings = Object.freeze({
  cloudProfileRef: ['spec', 'cloudProfile'],
  seedName: ['spec', 'seedName'],
  region: ['spec', 'region'],
  secretBindingName: ['spec', 'secretBindingName'],
  credentialsBindingName: ['spec', 'credentialsBindingName'],
  kubernetesVersion: ['spec', 'kubernetes', 'version'],
  providerType: ['spec', 'provider', 'type'],
  addons: ['spec', 'addons'],
  namespace: ['metadata', 'namespace'],
})

export function createShootHelperComposable (shootItem, options = {}) {
  const {
    cloudProfileStore = useCloudProfileStore(),
    configStore = useConfigStore(),
    gardenerExtensionStore = useGardenerExtensionStore(),
    credentialStore = useCredentialStore(),
    seedStore = useSeedStore(),
    projectStore = useProjectStore(),
  } = options

  const {
    cloudProfileRef,
    seedName,
    region,
    secretBindingName,
    credentialsBindingName,
    kubernetesVersion,
    providerType,
    addons,
    namespace,
  } = mapValues(shootPropertyMappings, path => {
    return computed(() => get(shootItem.value, path))
  })

  const { projectNameByNamespace } = projectStore
  const projectName = computed(() => {
    return projectNameByNamespace(namespace)
  })

  const project = computed(() => {
    return find(projectStore.projectList, ['metadata.name', projectName.value])
  })

  const infrastructureBinding = computed(() => {
    if (secretBindingName.value) {
      return find(infrastructureBindings.value, { kind: 'SecretBinding', metadata: { name: secretBindingName.value } })
    }
    if (credentialsBindingName.value) {
      return find(infrastructureBindings.value, { kind: 'CredentialsBinding', metadata: { name: credentialsBindingName.value } })
    }
    return undefined
  })

  const cloudProfiles = computed(() => {
    return cloudProfileStore.cloudProfilesByProviderType(providerType.value)
  })

  const defaultCloudProfileRef = computed(() => {
    const defaultCloudProfile = head(cloudProfiles.value)
    const name = get(defaultCloudProfile, ['metadata', 'name'])
    const cloudProfileRef = {
      name,
      kind: 'CloudProfile',
    }
    return cloudProfileRef
  })

  const cloudProfile = computed(() => {
    return cloudProfileStore.cloudProfileByRef(cloudProfileRef.value)
  })

  const seed = computed(() => {
    return seedStore.seedByName(seedName.value)
  })

  const seedIngressDomain = computed(() => {
    return get(seed.value, ['spec', 'ingress', 'domain'])
  })

  const seeds = computed(() => {
    return cloudProfileStore.seedsByCloudProfileRef(cloudProfileRef.value, project.value)
  })

  const isFailureToleranceTypeZoneSupported = computed(() => {
    const seedList = seedName.value
      ? [seed.value]
      : seeds.value
    return some(seedList, seed => {
      const zones = get(seed, ['spec', 'provider', 'zones'], [])
      return zones.length >= 3
    })
  })

  const allZones = computed(() => {
    return cloudProfileStore.zonesByCloudProfileRefAndRegion({
      cloudProfileRef: cloudProfileRef.value,
      region: region.value,
    })
  })

  const regionsWithSeed = computed(() => {
    return cloudProfileStore.regionsWithSeedByCloudProfileRef(cloudProfileRef.value, project.value)
  })

  const regionsWithoutSeed = computed(() => {
    return cloudProfileStore.regionsWithoutSeedByCloudProfileRef(cloudProfileRef.value, project.value)
  })

  const defaultNodesCIDR = computed(() => {
    return cloudProfileStore.getDefaultNodesCIDR(cloudProfileRef.value)
  })

  const infrastructureBindings = useCloudProviderEntityList(providerType, { credentialStore, gardenerExtensionStore, cloudProfileStore })

  const sortedKubernetesVersions = computed(() => {
    return cloudProfileStore.sortedKubernetesVersions(cloudProfileRef.value)
  })

  const kubernetesVersionIsNotLatestPatch = computed(() => {
    return cloudProfileStore.kubernetesVersionIsNotLatestPatch(kubernetesVersion.value, cloudProfileRef.value)
  })

  const { selfTerminationDays } = useCloudProviderBinding(infrastructureBinding)

  const allPurposes = computed(() => {
    if (some(addons.value, 'enabled')) {
      return ['evaluation']
    }
    return selfTerminationDays.value
      ? ['evaluation']
      : ['evaluation', 'development', 'testing', 'production']
  })

  const allLoadBalancerProviderNames = computed(() => {
    return cloudProfileStore.loadBalancerProviderNamesByCloudProfileRefAndRegion({
      cloudProfileRef: cloudProfileRef.value,
      region: region.value,
    })
  })

  const allLoadBalancerClassNames = computed(() => {
    return cloudProfileStore.loadBalancerClassNamesByCloudProfileRef(cloudProfileRef.value)
  })

  const partitionIDs = computed(() => {
    return cloudProfileStore.partitionIDsByCloudProfileRefAndRegion({
      cloudProfileRef: cloudProfileRef.value,
      region: region.value,
    })
  })

  const firewallImages = computed(() => {
    return cloudProfileStore.firewallImagesByCloudProfileRef(cloudProfileRef.value)
  })

  const firewallSizes = computed(() => {
    const firewallSizes = cloudProfileStore.firewallSizesByCloudProfileRefAndRegion({
      cloudProfileRef: cloudProfileRef.value,
      region: region.value,
    })
    return map(firewallSizes, 'name')
  })

  const allFloatingPoolNames = computed(() => {
    return cloudProfileStore.floatingPoolNamesByCloudProfileRefAndRegionAndDomain({
      cloudProfileRef: cloudProfileRef.value,
      region: region.value,
      secretDomain: get(infrastructureBinding.value, ['data', 'domainName']),
    })
  })

  const allMachineTypes = computed(() => {
    return cloudProfileStore.machineTypesByCloudProfileRef(cloudProfileRef.value)
  })

  const machineArchitectures = computed(() => {
    return cloudProfileStore.machineArchitecturesByCloudProfileRefAndRegion({
      cloudProfileRef: cloudProfileRef.value,
      region: region.value,
    })
  })

  const allVolumeTypes = computed(() => {
    return cloudProfileStore.volumeTypesByCloudProfileRef(cloudProfileRef.value)
  })

  const volumeTypes = computed(() => {
    return cloudProfileStore.volumeTypesByCloudProfileRefAndRegion({
      cloudProfileRef: cloudProfileRef.value,
      region: region.value,
    })
  })

  const machineImages = computed(() => {
    return cloudProfileStore.machineImagesByCloudProfileRef(cloudProfileRef.value)
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
    defaultCloudProfileRef,
    cloudProfile,
    seed,
    seedIngressDomain,
    seeds,
    isFailureToleranceTypeZoneSupported,
    allZones,
    defaultNodesCIDR,
    infrastructureBindings,
    infrastructureBinding,
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
