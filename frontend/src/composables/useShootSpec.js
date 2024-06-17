//
// SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { computed } from 'vue'

import { useCloudProfileStore } from '@/store/cloudProfile'
import { useSeedStore } from '@/store/seed'

import {
  get,
  uniq,
  flatMap,
  cloneDeep,
  find,
  compact,
} from '@/lodash'

export function useShootSpec (shootItem, options = {}) {
  const {
    cloudProfileStore = useCloudProfileStore(),
    seedStore = useSeedStore(),
  } = options

  const shootSpec = computed(() => {
    return get(shootItem.value, 'spec', {})
  })

  const shootPurpose = computed(() => {
    return get(shootSpec.value, 'purpose')
  })

  const isTestingCluster = computed(() => {
    return shootPurpose.value === 'testing'
  })

  const isShootActionsDisabledForPurpose = computed(() => {
    return shootPurpose.value === 'infrastructure'
  })

  const isShootSettingHibernated = computed(() => {
    return get(shootSpec.value, 'hibernation.enabled', false)
  })

  const shootSecretBindingName = computed(() => {
    return shootSpec.value.secretBindingName
  })

  const shootK8sVersion = computed(() => {
    return get(shootSpec.value, 'kubernetes.version')
  })

  const shootAvailableK8sUpdates = computed(() => {
    return cloudProfileStore.availableKubernetesUpdatesForShoot(shootK8sVersion.value, shootCloudProfileName.value)
  })

  const shootSupportedPatchAvailable = computed(() => {
    return !!find(shootAvailableK8sUpdates.value?.patch, 'isSupported')
  })

  const shootSupportedUpgradeAvailable = computed(() => {
    return !!find(shootAvailableK8sUpdates.value?.minor, 'isSupported')
  })

  const shootKubernetesVersionObject = computed(() => {
    const kubernetesVersionObjects = cloudProfileStore.kubernetesVersions(shootCloudProfileName.value)
    return find(kubernetesVersionObjects, ['version', shootK8sVersion.value]) ?? {}
  })

  const shootEnableStaticTokenKubeconfig = computed(() => {
    return get(shootSpec.value, 'kubernetes.enableStaticTokenKubeconfig', true)
  })

  const shootCloudProfileName = computed(() => {
    return shootSpec.value.cloudProfileName
  })

  const shootCloudProviderKind = computed(() => {
    return get(shootSpec.value, 'provider.type')
  })

  const shootWorkerGroups = computed(() => {
    return get(shootSpec.value, 'provider.workers', [])
  })

  const hasShootWorkerGroups = computed(() => {
    return !!shootWorkerGroups.value.length
  })

  const shootAddons = computed(() => {
    return cloneDeep(get(shootSpec.value, 'addons', {}))
  })

  const shootRegion = computed(() => {
    return shootSpec.value.region
  })

  const shootZones = computed(() => {
    return compact(uniq(flatMap(get(shootSpec.value, 'provider.workers'), 'zones')))
  })

  const podsCidr = computed(() => {
    return get(shootSpec.value, 'networking.pods')
  })

  const nodesCidr = computed(() => {
    return get(shootSpec.value, 'networking.nodes')
  })

  const servicesCidr = computed(() => {
    return get(shootSpec.value, 'networking.services')
  })

  const shootDomain = computed(() => {
    return get(shootSpec.value, 'dns.domain')
  })

  const isCustomShootDomain = computed(() => {
    return !!shootDnsPrimaryProvider.value
  })

  const shootDnsPrimaryProvider = computed(() => {
    return find(shootSpec.value.dns?.providers, { primary: true })
  })

  const shootExtensionDnsProviders = computed(() => {
    const extensionDns = find(shootSpec.value.extensions, ['type', 'shoot-dns-service'])
    return get(extensionDns, 'providerConfig.providers')
  })

  const shootHibernationSchedules = computed(() => {
    return get(shootSpec.value, 'hibernation.schedules', [])
  })

  const shootMaintenance = computed(() => {
    return get(shootSpec.value, 'maintenance', {})
  })

  const shootControlPlaneHighAvailabilityFailureTolerance = computed(() => {
    return get(shootSpec.value, 'controlPlane.highAvailability.failureTolerance.type')
  })

  const shootSeedName = computed(() => {
    return get(shootSpec.value, 'seedName')
  })

  const isSeedUnreachable = computed(() => {
    return seedStore.isSeedUnreachableByName(shootSeedName.value)
  })

  const shootResources = computed(() => {
    return get(shootSpec.value, 'resources')
  })

  return {
    shootSpec,
    shootPurpose,
    isTestingCluster,
    isShootActionsDisabledForPurpose,
    isShootSettingHibernated,
    shootSecretBindingName,
    shootK8sVersion,
    shootAvailableK8sUpdates,
    shootKubernetesVersionObject,
    shootSupportedPatchAvailable,
    shootSupportedUpgradeAvailable,
    shootEnableStaticTokenKubeconfig,
    shootCloudProfileName,
    shootCloudProviderKind,
    shootWorkerGroups,
    hasShootWorkerGroups,
    shootAddons,
    shootRegion,
    shootZones,
    podsCidr,
    nodesCidr,
    servicesCidr,
    shootDomain,
    isCustomShootDomain,
    shootDnsPrimaryProvider,
    shootExtensionDnsProviders,
    shootHibernationSchedules,
    shootMaintenance,
    shootControlPlaneHighAvailabilityFailureTolerance,
    shootSeedName,
    isSeedUnreachable,
    shootResources,
  }
}
