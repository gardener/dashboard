/* eslint-disable no-unused-vars */
//
// SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  defineStore,
  acceptHMRUpdate,
} from 'pinia'
import {
  ref,
  computed,
  reactive,
} from 'vue'

import utils from '@/utils'

import { useConfigStore } from '../config'
import { useCloudProfileStore } from '../cloudProfile'
import { useGardenerExtensionStore } from '../gardenerExtension'
import { useSecretStore } from '../secret'

import {
  set,
  get,
  unset,
  head,
  omit,
  map,
  find,
  isEmpty,
  isEqual,
  cloneDeep,
  includes,
} from '@/lodash'

const useShootContextStore = defineStore('shootContext', () => {
  const configStore = useConfigStore()
  const cloudProfileStore = useCloudProfileStore()
  const secretStore = useSecretStore()
  const gardenerExtensionStore = useGardenerExtensionStore()

  const state = reactive({})

  /* name */
  const name = computed({
    get () {
      return get(state, 'metadata.name')
    },
    set (value) {
      set(state, 'metadata.name', value)
    },
  })

  function resetName () {
    if (!name.value) {
      name.value = utils.shortRandomString(10)
    }
  }

  /* kubernetesVersion */
  const kubernetesVersion = computed({
    get () {
      return get(state, 'spec.kubernetes.version')
    },
    set (value) {
      set(state, 'spec.kubernetes.version', value)
    },
  })

  function resetKubernetesVersion () {
    kubernetesVersion.value = defaultKubernetesVersion.value
  }

  const defaultKubernetesVersion = computed(() => {
    const kubernetesVersionDescriptor = cloudProfileStore.defaultKubernetesVersionForCloudProfileName(state.cloudProfileName)
    return get(kubernetesVersionDescriptor, 'version')
  })

  /* enableStaticTokenKubeconfig */
  const enableStaticTokenKubeconfig = computed({
    get () {
      return !!get(state, 'spec.kubernetes.enableStaticTokenKubeconfig')
    },
    set (value) {
      set(state, 'spec.kubernetes.enableStaticTokenKubeconfig', !!value)
    },
  })

  /* infrastructureKind */
  const infrastructureKind = computed({
    get () {
      return get(state, 'spec.provider.type')
    },
    set (value) {
      set(state, 'spec.provider.type', value)
      resetCloudProfileName()
    },
  })

  /* cloudProfileName */
  const cloudProfileName = computed({
    get () {
      return get(state, 'spec.cloudProfileName')
    },
    set (value) {
      set(state, 'spec.cloudProfileName', value)
      resetName()
      resetKubernetesVersion()
      resetInfrastructureSecret()
      resetRegion()
      resetLoadBalancerProviderName()
      resetFloatingPoolName()
      resetLoadBalancerClassNames()
      resetFirewallImage()
      resetProjectID()
    },
  })

  function resetCloudProfileName () {
    cloudProfileName.value = defaultCloudProfileName.value
  }

  const defaultCloudProfileName = computed(() => {
    const cloudProfile = head(cloudProfiles.value)
    return get(cloudProfile, 'metadata.name')
  })

  /* region */
  const region = computed({
    get () {
      return get(state, 'spec.region')
    },
    set (value) {
      set(state, 'spec.region', value)
      resetPartitionID()
      resetFloatingPoolName()
      resetLoadBalancerProviderName()
    },
  })

  function resetRegion () {
    region.value = defaultRegion.value
  }

  const defaultRegion = computed(() => {
    return head(regionsWithSeed.value) ??
      showAllRegions.value
      ? head(regionsWithoutSeed.value)
      : undefined
  })

  /* purpose */
  const purpose = computed({
    get () {
      return get(state, 'spec.purpose')
    },
    set (value) {
      set(state, 'spec.purpose', includes(purposes.value, value) ? value : '')
    },
  })

  function resetPurpose () {
    if (!state.purpose) {
      purpose.value = defaultPurpose.value
    } else if (!includes(purposes.value, purpose.value)) {
      purpose.value = ''
    }
  }

  const defaultPurpose = computed(() => {
    return head(purposes.value)
  })

  /* networkingType */
  const networkingType = computed({
    get () {
      return get(state, 'spec.networking.type')
    },
    set (value) {
      set(state, 'spec.networking.type', value)
    },
  })

  function resetNetworkingType () {
    networkingType.value = defaultNetworkingType.value
  }

  const defaultNetworkingType = computed(() => {
    return head(gardenerExtensionStore.networkingTypes)
  })

  /* secretBindingName */
  const secretBindingName = computed({
    get () {
      return get(state, 'spec.secretBindingName')
    },
    set (value) {
      set(state, 'spec.secretBindingName', value)
    },
  })

  /* infrastructureSecret */
  const infrastructureSecret = computed({
    get () {
      return find(infrastructureSecrets.value, ['metadata.name', secretBindingName.value])
    },
    set (value) {
      secretBindingName.value = get(value, 'metadata.name')
      resetPurpose()
    },
  })

  function resetInfrastructureSecret () {
    infrastructureSecret.value = defaultInfrastructureSecret.value
  }

  const defaultInfrastructureSecret = computed(() => {
    return head(infrastructureSecrets.value)
  })

  /* loadBalancerProviderName */
  const loadBalancerProviderName = computed({
    get () {
      return get(state, 'spec.provider.controlPlaneConfig.loadBalancerProvider')
    },
    set (value) {
      set(state, 'spec.provider.controlPlaneConfig.loadBalancerProvider', value)
    },
  })

  function resetLoadBalancerProviderName () {
    loadBalancerProviderName.value = defaultLoadBalancerProviderName.value
  }

  const defaultLoadBalancerProviderName = computed(() => {
    return head(allLoadBalancerProviderNames.value)
  })

  /* loadBalancerClassNames */
  const loadBalancerClasses = computed({
    get () {
      return get(state, 'spec.provider.controlPlaneConfig.loadBalancerClasses')
    },
    set (value) {
      set(state, 'spec.provider.controlPlaneConfig.loadBalancerClasses', value)
    },
  })

  /* loadBalancerClassNames */
  const loadBalancerClassNames = computed({
    get () {
      return map(loadBalancerClasses.value, 'name')
    },
    set (value) {
      loadBalancerClasses.value = map(value, name => ({ name }))
    },
  })

  function resetLoadBalancerClassNames () {
    loadBalancerClassNames.value = defaultLoadBalancerClassNames.value
  }

  const defaultLoadBalancerClassNames = computed(() => {
    const loadBalancerClassName = includes(allLoadBalancerClassNames.value, 'default')
      ? 'default'
      : head(allLoadBalancerClassNames.value)
    return loadBalancerClassName ? [loadBalancerClassName] : []
  })

  /* partitionID */
  const partitionID = computed({
    get () {
      return get(state, 'spec.provider.infrastructureConfig.partitionID')
    },
    set (value) {
      set(state, 'spec.provider.infrastructureConfig.partitionID', value)
      resetFirewallSize()
      resetFirewallNetworks()
    },
  })

  function resetPartitionID () {
    partitionID.value = defaultPartitionID.value
  }

  const defaultPartitionID = computed(() => {
    return head(partitionIDs.value)
  })

  /* projectID */
  const projectID = computed({
    get () {
      return get(state, 'spec.provider.infrastructureConfig.projectID')
    },
    set (value) {
      set(state, 'spec.provider.infrastructureConfig.projectID', value)
    },
  })

  function resetProjectID () {
    projectID.value = defaultProjectID.value
  }

  const defaultProjectID = ref()

  /* floatingPoolName */
  const floatingPoolName = computed({
    get () {
      return get(state, 'spec.provider.infrastructureConfig.floatingPoolName')
    },
    set (value) {
      set(state, 'spec.provider.infrastructureConfig.floatingPoolName', value)
    },
  })

  function resetFloatingPoolName () {
    floatingPoolName.value = defaultFloatingPoolName.value
  }

  const defaultFloatingPoolName = computed(() => {
    return head(allFloatingPoolNames.value)
  })

  /* firewallImage */
  const firewallImage = computed({
    get () {
      return get(state, 'spec.provider.infrastructureConfig.firewall.image')
    },
    set (value) {
      set(state, 'spec.provider.infrastructureConfig.firewall.image', value)
    },
  })

  function resetFirewallImage () {
    firewallImage.value = defaultFirewallImage.value
  }

  const defaultFirewallImage = computed(() => {
    return head(firewallImages.value)
  })

  /* firewallSize */
  const firewallSize = computed({
    get () {
      return get(state, 'spec.provider.infrastructureConfig.firewall.size')
    },
    set (value) {
      set(state, 'spec.provider.infrastructureConfig.firewall.size', value)
    },
  })

  function resetFirewallSize () {
    firewallSize.value = defaultFirewallSize.value
  }

  const defaultFirewallSize = computed(() => {
    return head(firewallSizes.value)
  })

  /* firewallNetworks */
  const firewallNetworks = computed({
    get () {
      return get(state, 'spec.provider.infrastructureConfig.firewall.networks')
    },
    set (value) {
      set(state, 'spec.provider.infrastructureConfig.firewall.networks', value)
    },
  })

  function resetFirewallNetworks () {
    firewallNetworks.value = defaultFirewallNetworks.value
  }

  const defaultFirewallNetworks = computed(() => {
    const firewallNetwork = find(allFirewallNetworks.value, ['key', 'internet'])
    return firewallNetwork
      ? [firewallNetwork.value]
      : undefined
  })

  /* getters */
  const cloudProfiles = computed(() => {
    return cloudProfileStore.cloudProfilesByCloudProviderKind(infrastructureKind.value)
  })

  const cloudProfile = computed(() => {
    return cloudProfileStore.seedsByCloudProfileName(cloudProfileName.value)
  })

  const isZonedCluster = computed(() => {
    return utils.isZonedCluster({
      cloudProviderKind: infrastructureKind.value,
      isNewCluster: true,
    })
  })

  const seeds = computed(() => {
    return cloudProfileStore.seedsByCloudProfileName(cloudProfileName.value)
  })

  const zones = computed(() => {
    return cloudProfileStore.zonesByCloudProfileNameAndRegion({
      cloudProfileName: cloudProfileName.value,
      region: region.value,
    })
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

  const purposes = computed(() => {
    return utils.purposesForSecret(infrastructureSecret.value)
  })

  const regionsWithSeed = computed(() => {
    return cloudProfileStore.regionsWithSeedByCloudProfileName(cloudProfileName.value)
  })

  const regionsWithoutSeed = computed(() => {
    return cloudProfileStore.regionsWithoutSeedByCloudProfileName(cloudProfileName.value)
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
      partitionID: partitionID.value,
    })
  })

  const allFloatingPoolNames = computed(() => {
    return cloudProfileStore.floatingPoolNamesByCloudProfileNameAndRegionAndDomain({
      cloudProfileName: cloudProfileName.value,
      region: region.value,
      secretDomain: get(infrastructureSecret.value, 'data.domainName'),
    })
  })

  const accessRestrictionDefinitions = computed(() => {
    return cloudProfileStore.accessRestrictionDefinitionsByCloudProfileNameAndRegion({
      cloudProfileName: cloudProfileName.value,
      region: region.value,
    })
  })

  const accessRestrictionNoItemsText = computed(() => {
    return cloudProfileStore.accessRestrictionNoItemsTextForCloudProfileNameAndRegion({
      cloudProfileName: cloudProfileName.value,
      region: region.value,
    })
  })

  const networkingTypes = computed(() => {
    return gardenerExtensionStore.networkingTypes
  })

  const showAllRegions = computed(() => {
    return configStore.seedCandidateDeterminationStrategy !== 'SameRegion'
  })

  function $reset () {
    // TODO
  }

  return {
    name,
    infrastructureKind,
    kubernetesVersion,
    cloudProfileName,
    secretBindingName,
    networkingType,
    purpose,
    region,
    cloudProfiles,
    cloudProfile,
    seeds,
    zones,
    isZonedCluster,
    defaultNodesCIDR,
    infrastructureSecrets,
    infrastructureSecret,
    sortedKubernetesVersions,
    purposes,
    kubernetesVersionIsNotLatestPatch,
    accessRestrictionDefinitions,
    accessRestrictionNoItemsText,
    regionsWithSeed,
    regionsWithoutSeed,
    showAllRegions,
    networkingTypes,
    allFloatingPoolNames,
    allLoadBalancerClassNames,
    allLoadBalancerProviderNames,
    partitionIDs,
    firewallImages,
    firewallSizes,
    allFirewallNetworks,
  }
})

export default useShootContextStore

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useShootContextStore, import.meta.hot))
}
