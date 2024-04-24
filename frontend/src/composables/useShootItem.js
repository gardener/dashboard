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
import { useProjectStore } from '@/store/project'
import { useSeedStore } from '@/store/seed'

import utils from '@/utils'
import { errorCodesFromArray } from '@/utils/errorCodes'

import {
  get,
  uniq,
  flatMap,
  cloneDeep,
  find,
  some,
  filter,
  compact,
} from '@/lodash'

const forceDeleteErrorCodes = Object.freeze([
  'ERR_CLEANUP_CLUSTER_RESOURCES',
  'ERR_CONFIGURATION_PROBLEM',
  'ERR_INFRA_DEPENDENCIES',
  'ERR_INFRA_UNAUTHENTICATED',
  'ERR_INFRA_UNAUTHORIZED',
])

export function createShootItemComposable (shootItem, options = {}) {
  const {
    cloudProfileStore = useCloudProfileStore(),
    projectStore = useProjectStore(),
    seedStore = useSeedStore(),
  } = options

  const shootMetadata = computed(() => {
    return get(shootItem.value, 'metadata', {})
  })
  const shootName = computed(() => {
    return shootMetadata.value.name
  })
  const shootNamespace = computed(() => {
    return shootMetadata.value.namespace
  })
  const isShootMarkedForDeletion = computed(() => {
    if (isShootMarkedForForceDeletion.value) {
      return true
    }
    const confirmation = get(shootAnnotations.value, ['confirmation.gardener.cloud/deletion'])
    const deletionTimestamp = shootDeletionTimestamp.value
    return !!deletionTimestamp && utils.isTruthyValue(confirmation)
  })
  const isShootMarkedForForceDeletion = computed(() => {
    const confirmation = get(shootAnnotations.value, ['confirmation.gardener.cloud/force-deletion'])
    const deletionTimestamp = shootDeletionTimestamp.value

    return !!deletionTimestamp && utils.isTruthyValue(confirmation)
  })
  const shootCreatedBy = computed(() => {
    return utils.getCreatedBy(shootMetadata.value)
  })
  const shootCreatedAt = computed(() => {
    return utils.getTimestampFormatted(shootMetadata.value.creationTimestamp)
  })
  const shootCreationTimestamp = computed(() => {
    return shootMetadata.value.creationTimestamp
  })
  const isShootReconciliationDeactivated = computed(() => {
    return utils.isReconciliationDeactivated(shootMetadata.value)
  })
  const shootGenerationValue = computed(() => {
    return shootMetadata.value.generation
  })
  const shootDeletionTimestamp = computed(() => {
    return shootMetadata.value.deletionTimestamp
  })
  const shootProjectName = computed(() => {
    return projectStore.projectNameByNamespace(shootMetadata.value)
  })
  const shootAnnotations = computed(() => {
    return get(shootMetadata.value, 'annotations', {})
  })
  const shootGardenOperation = computed(() => {
    return shootAnnotations.value['gardener.cloud/operation']
  })
  const shootPurpose = computed(() => {
    return get(shootSpec.value, 'purpose')
  })
  const isTestingCluster = computed(() => {
    return shootPurpose.value === 'testing'
  })
  const shootExpirationTimestamp = computed(() => {
    return shootAnnotations.value['shoot.gardener.cloud/expiration-timestamp'] || shootAnnotations.value['shoot.garden.sapcloud.io/expirationTimestamp']
  })
  const isShootActionsDisabledForPurpose = computed(() => {
    return shootPurpose.value === 'infrastructure'
  })
  const shootSpec = computed(() => {
    return get(shootItem.value, 'spec', {})
  })
  const isShootSettingHibernated = computed(() => {
    return get(shootSpec.value, 'hibernation.enabled', false)
  })
  const isShootStatusHibernated = computed(() => {
    return utils.isShootStatusHibernated(shootStatus.value)
  })
  const isShootStatusHibernationProgressing = computed(() => {
    return isShootSettingHibernated.value !== isShootStatusHibernated.value
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
    return some(shootDnsProviders.value, 'primary')
  })
  const shootDnsProviders = computed(() => {
    return get(shootSpec.value, 'dns.providers')
  })
  const shootHibernationSchedules = computed(() => {
    return get(shootSpec.value, 'hibernation.schedules', [])
  })
  const shootMaintenance = computed(() => {
    return get(shootSpec.value, 'maintenance', [])
  })
  const shootControlPlaneHighAvailabilityFailureTolerance = computed(() => {
    return get(shootSpec.value, 'controlPlane.highAvailability.failureTolerance.type')
  })
  const shootInfo = computed(() => {
    return get(shootItem.value, 'info', {})
  })
  const seedShootIngressDomain = computed(() => {
    return shootInfo.value.seedShootIngressDomain || ''
  })
  const canLinkToSeed = computed(() => {
    return get(shootInfo.value, 'canLinkToSeed', false)
  })
  const isShootLastOperationTypeDelete = computed(() => {
    return utils.isTypeDelete(shootLastOperation.value)
  })
  const isShootLastOperationTypeControlPlaneMigrating = computed(() => {
    return shootLastOperation.value.type === 'Migrate' || (shootLastOperation.value.type === 'Restore' && shootLastOperation.value.state !== 'Succeeded')
  })
  const shootLastOperationTypeControlPlaneMigrationMessage = computed(() => {
    switch (shootLastOperation.value.type) {
      case 'Migrate':
        return 'Deleting Resources on old Seed'
      case 'Restore':
        return 'Creating Resources on new Seed'
    }
    return ''
  })
  const shootLastOperation = computed(() => {
    return get(shootItem.value, 'status.lastOperation', {})
  })
  const shootLastErrors = computed(() => {
    return get(shootItem.value, 'status.lastErrors', [])
  })
  const shootConditions = computed(() => {
    return get(shootItem.value, 'status.conditions', [])
  })
  const shootConstraints = computed(() => {
    return get(shootItem.value, 'status.constraints', [])
  })
  const shootCredentialsRotation = computed(() => {
    return get(shootItem.value, 'status.credentials.rotation', {})
  })
  const shootReadiness = computed(() => {
    const shootConstraintsWithErrorCode = filter(shootConstraints.value, constraint => {
      return constraint.codes && constraint.codes.length
    })
    return [
      ...shootConditions.value,
      ...shootConstraintsWithErrorCode,
    ]
  })
  const shootObservedGeneration = computed(() => {
    return get(shootItem.value, 'status.observedGeneration')
  })
  const shootTechnicalId = computed(() => {
    return get(shootItem.value, 'status.technicalID')
  })
  const shootSeedName = computed(() => {
    return get(shootSpec.value, 'seedName')
  })
  const isSeedUnreachable = computed(() => {
    return seedStore.isSeedUnreachableByName(shootSeedName.value)
  })
  const shootSelectedAccessRestrictions = computed(() => {
    return cloudProfileStore.selectedAccessRestrictionsForShootByCloudProfileNameAndRegion({
      shootResource: shootItem.value,
      cloudProfileName: shootCloudProfileName.value,
      region: shootRegion.value,
    })
  })
  const hibernationPossibleConstraint = computed(() => {
    return find(shootConstraints.value, ['type', 'HibernationPossible'])
  })
  const isHibernationPossible = computed(() => {
    const status = get(hibernationPossibleConstraint.value, 'status', 'True')
    return status !== 'False'
  })
  const hibernationPossibleMessage = computed(() => {
    return get(hibernationPossibleConstraint.value, 'message', 'Hibernation currently not possible')
  })
  const maintenancePreconditionSatisfiedConstraint = computed(() => {
    const constraints = shootConstraints.value
    return find(constraints, ['type', 'MaintenancePreconditionsSatisfied'])
  })
  const isMaintenancePreconditionSatisfied = computed(() => {
    const status = get(maintenancePreconditionSatisfiedConstraint.value, 'status', 'True')
    return status !== 'False'
  })
  const maintenancePreconditionSatisfiedMessage = computed(() => {
    return get(maintenancePreconditionSatisfiedConstraint.value, 'message', 'It may not be safe to trigger maintenance for this cluster')
  })
  const caCertificateValiditiesAcceptableConstraint = computed(() => {
    const constraints = shootConstraints.value
    return find(constraints, ['type', 'CACertificateValiditiesAcceptable'])
  })
  const isCACertificateValiditiesAcceptable = computed(() => {
    const status = get(caCertificateValiditiesAcceptableConstraint.value, 'status', 'True')
    return status !== 'False'
  })
  const caCertificateValiditiesAcceptableMessage = computed(() => {
    return get(caCertificateValiditiesAcceptableConstraint.value, 'message', 'There is at least one CA certificate which expires in less than 1y. Consider schduling a Certificate Authorities Rotation for this cluster')
  })
  const shootStatus = computed(() => {
    return get(shootItem.value, 'status', {})
  })
  const lastMaintenance = computed(() => {
    return get(shootStatus.value, 'lastMaintenance', {})
  })
  const isLastMaintenanceFailed = computed(() => {
    return lastMaintenance.value.state === 'Failed'
  })
  const canForceDeleteShoot = computed(() => {
    if (!shootDeletionTimestamp.value) {
      return false
    }

    const shootErrorCodes = errorCodesFromArray(shootLastErrors.value)
    return shootErrorCodes.some(item => forceDeleteErrorCodes.includes(item))
  })

  const projectNameByNamespace = namespace => projectStore.projectNameByNamespace(namespace)
  const isSeedUnreachableByName = name => seedStore.isSeedUnreachableByName(name)

  return {
    shootItem,
    shootMetadata,
    shootName,
    shootNamespace,
    isShootMarkedForDeletion,
    isShootMarkedForForceDeletion,
    shootCreatedBy,
    shootCreatedAt,
    shootCreationTimestamp,
    isShootReconciliationDeactivated,
    shootGenerationValue,
    shootDeletionTimestamp,
    shootProjectName,
    shootAnnotations,
    shootGardenOperation,
    shootPurpose,
    isTestingCluster,
    shootExpirationTimestamp,
    isShootActionsDisabledForPurpose,
    shootSpec,
    isShootSettingHibernated,
    isShootStatusHibernated,
    isShootStatusHibernationProgressing,
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
    shootDnsProviders,
    shootHibernationSchedules,
    shootMaintenance,
    shootControlPlaneHighAvailabilityFailureTolerance,
    shootInfo,
    seedShootIngressDomain,
    canLinkToSeed,
    isShootLastOperationTypeDelete,
    isShootLastOperationTypeControlPlaneMigrating,
    shootLastOperationTypeControlPlaneMigrationMessage,
    shootLastOperation,
    shootLastErrors,
    shootConditions,
    shootConstraints,
    shootCredentialsRotation,
    shootReadiness,
    shootObservedGeneration,
    shootTechnicalId,
    shootSeedName,
    isSeedUnreachable,
    shootSelectedAccessRestrictions,
    hibernationPossibleConstraint,
    isHibernationPossible,
    hibernationPossibleMessage,
    maintenancePreconditionSatisfiedConstraint,
    isMaintenancePreconditionSatisfied,
    maintenancePreconditionSatisfiedMessage,
    caCertificateValiditiesAcceptableConstraint,
    isCACertificateValiditiesAcceptable,
    caCertificateValiditiesAcceptableMessage,
    shootStatus,
    lastMaintenance,
    isLastMaintenanceFailed,
    canForceDeleteShoot,
    projectNameByNamespace,
    isSeedUnreachableByName,
  }
}

export function useShootItem () {
  return inject('shoot-item', {})
}

export function useProvideShootItem (...args) {
  const shootItemComposable = createShootItemComposable(...args)
  provide('shoot-item', shootItemComposable)
  return shootItemComposable
}
