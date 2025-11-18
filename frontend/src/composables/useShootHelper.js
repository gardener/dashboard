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
import { useKubernetesVersions } from '@/composables/useCloudProfile/useKubernetesVersions.js'
import { useMachineImages } from '@/composables/useCloudProfile/useMachineImages.js'
import { useMachineTypes } from '@/composables/useCloudProfile/useMachineTypes.js'
import { useDefaultNodesCIDR } from '@/composables/useCloudProfile/useDefaultNodesCIDR.js'
import { useRegions } from '@/composables/useCloudProfile/useRegions.js'
import { useOpenStackConstraints } from '@/composables/useCloudProfile/useOpenStackConstraints'
import { useMetalConstraints } from '@/composables/useCloudProfile/useMetalConstraints.js'
import { useVolumeTypes } from '@/composables/useCloudProfile/useVolumeTypes'

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

  const {
    sortedKubernetesVersions,
    useKubernetesVersionIsNotLatestPatch,
  } = useKubernetesVersions(cloudProfile)

  const {
    machineImages: machineImagesFromComposable,
  } = useMachineImages(cloudProfile)

  const {
    useZones,
    useRegionsWithSeed,
    useRegionsWithoutSeed,
  } = useRegions(cloudProfile)

  const {
    machineTypes: allMachineTypesFromComposable,
    useMachineArchitectures,
  } = useMachineTypes(cloudProfile, useZones)

  const {
    useFloatingPoolNames,
    useLoadBalancerProviderNames,
    loadBalancerClassNames,
  } = useOpenStackConstraints(cloudProfile)

  const {
    usePartitionIDs,
    firewallImages: firewallImagesFromComposable,
    useFirewallSizes,
  } = useMetalConstraints(cloudProfile, useZones)

  const {
    volumeTypes: allVolumeTypesFromComposable,
    useFilteredVolumeTypes,
  } = useVolumeTypes(cloudProfile)

  const seed = computed(() => {
    return seedStore.seedByName(seedName.value)
  })

  const seedIngressDomain = computed(() => {
    return get(seed.value, ['spec', 'ingress', 'domain'])
  })

  const seeds = computed(() => {
    const cloudProfile = cloudProfileStore.cloudProfileByRef(cloudProfileRef.value)
    return seedStore.seedsForCloudProfileByProject(cloudProfile, project.value)
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

  const allZones = useZones(region)

  const regionsWithSeed = useRegionsWithSeed(project)

  const regionsWithoutSeed = useRegionsWithoutSeed(project)

  const { defaultNodesCIDR } = useDefaultNodesCIDR(cloudProfile)

  const infrastructureBindings = useCloudProviderEntityList(providerType, { credentialStore, gardenerExtensionStore, cloudProfileStore })

  const kubernetesVersionIsNotLatestPatch = useKubernetesVersionIsNotLatestPatch(kubernetesVersion)

  const { selfTerminationDays } = useCloudProviderBinding(infrastructureBinding)

  const allPurposes = computed(() => {
    if (some(addons.value, 'enabled')) {
      return ['evaluation']
    }
    return selfTerminationDays.value
      ? ['evaluation']
      : ['evaluation', 'development', 'testing', 'production']
  })

  const secretDomain = computed(() => get(infrastructureBinding.value, ['data', 'domainName']))

  const allLoadBalancerProviderNames = useLoadBalancerProviderNames(region)

  const allLoadBalancerClassNames = loadBalancerClassNames

  const partitionIDs = usePartitionIDs(region)

  const firewallImages = firewallImagesFromComposable

  const sizes = useFirewallSizes(region)
  const firewallSizes = computed(() => {
    return map(sizes.value, 'name')
  })

  const allFloatingPoolNames = useFloatingPoolNames(region, secretDomain)

  const allMachineTypes = allMachineTypesFromComposable

  const machineArchitectures = useMachineArchitectures(region)

  const allVolumeTypes = allVolumeTypesFromComposable

  const volumeTypes = useFilteredVolumeTypes(region)

  const machineImages = machineImagesFromComposable

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
