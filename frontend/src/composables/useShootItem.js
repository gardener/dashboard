//
// SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  computed,
  isRef,
  inject,
  provide,
} from 'vue'

import { useProjectStore } from '@/store/project'
import { useCloudProfileStore } from '@/store/cloudProfile'

import { errorCodesFromArray } from '@/utils/errorCodes'

import { useShootMetadata } from './useShootMetadata'
import { useShootSpec } from './useShootSpec'
import { useShootStatus } from './useShootStatus'
import { useShootInfo } from './useShootInfo'
import { useShootAccessRestrictions } from './useShootAccessRestrictions'

const forceDeleteErrorCodes = Object.freeze([
  'ERR_CLEANUP_CLUSTER_RESOURCES',
  'ERR_CONFIGURATION_PROBLEM',
  'ERR_INFRA_DEPENDENCIES',
  'ERR_INFRA_UNAUTHENTICATED',
  'ERR_INFRA_UNAUTHORIZED',
])

export function createShootItemComposable (shootItem, options = {}) {
  const {
    projectStore = useProjectStore(),
    cloudProfileStore = useCloudProfileStore(),
  } = options

  if (!isRef(shootItem)) {
    throw new TypeError('First argument `shootItem` must be a ref object')
  }

  const {
    shootMetadata,
    shootNamespace,
    shootName,
    shootProjectName,
    shootCreationTimestamp,
    shootDeletionTimestamp,
    shootGeneration,
    shootUid,
    shootAnnotations,
    getShootAnnotation,
    setShootAnnotation,
    unsetShootAnnotation,
    shootLabels,
    getShootLabel,
    setShootLabel,
    unsetShootLabel,
    shootCreatedAt,
    shootCreatedBy,
    shootConfirmationDeletion,
    isShootMarkedForDeletion,
    shootConfirmationForceDeletion,
    isShootMarkedForForceDeletion,
    isShootReconciliationDeactivated,
    isNewCluster,
    shootGardenerOperation,
    shootExpirationTimestamp,
  } = useShootMetadata(shootItem, {
    projectStore,
  })

  const {
    shootSpec,
    shootPurpose,
    isTestingCluster,
    isShootActionsDisabledForPurpose,
    isShootSettingHibernated,
    shootSecretBindingName,
    shootCredentialsBindingName,
    shootCloudProviderBinding,
    shootK8sVersion,
    shootAvailableK8sUpdates,
    shootKubernetesVersionObject,
    shootSupportedPatchAvailable,
    shootSupportedUpgradeAvailable,
    shootCloudProfileRef,
    shootProviderType,
    shootWorkerGroups,
    hasShootWorkerGroups,
    sshAccessEnabled,
    shootAddons,
    shootRegion,
    shootZones,
    podsCidr,
    nodesCidr,
    servicesCidr,
    shootDomain,
    isCustomShootDomain,
    shootDnsPrimaryProvider,
    shootDnsServiceExtensionProviders,
    shootDnsProviders,
    shootHibernationSchedules,
    shootMaintenance,
    shootControlPlaneHighAvailabilityFailureTolerance,
    shootSeedName,
    shootResources,
  } = useShootSpec(shootItem, {
    cloudProfileStore,
  })

  const {
    shootStatus,
    isShootStatusHibernated,
    isShootLastOperationTypeDelete,
    isShootLastOperationTypeControlPlaneMigrating,
    shootLastOperationTypeControlPlaneMigrationMessage,
    shootLastOperation,
    shootLastErrors,
    shootConditions,
    shootConstraints,
    shootCredentialsRotation,
    shootObservedGeneration,
    shootTechnicalId,
    lastMaintenance,
    isLastMaintenanceFailed,
    hibernationPossibleConstraint,
    isHibernationPossible,
    hibernationPossibleMessage,
    maintenancePreconditionSatisfiedConstraint,
    isMaintenancePreconditionSatisfied,
    maintenancePreconditionSatisfiedMessage,
    caCertificateValiditiesAcceptableConstraint,
    isCACertificateValiditiesAcceptable,
    caCertificateValiditiesAcceptableMessage,
  } = useShootStatus(shootItem)

  const {
    shootInfo,
    canLinkToSeed,
  } = useShootInfo(shootItem)

  const {
    accessRestrictionList,
  } = useShootAccessRestrictions(shootItem, {
    cloudProfileStore,
  })

  const isShootStatusHibernationProgressing = computed(() => {
    return isShootSettingHibernated.value !== isShootStatusHibernated.value
  })

  const canForceDeleteShoot = computed(() => {
    if (!shootDeletionTimestamp.value) {
      return false
    }

    const shootErrorCodes = errorCodesFromArray(shootLastErrors.value)
    return shootErrorCodes.some(item => forceDeleteErrorCodes.includes(item))
  })

  return {
    shootItem,
    /* metadata */
    shootMetadata,
    shootNamespace,
    shootName,
    shootProjectName,
    shootCreationTimestamp,
    shootDeletionTimestamp,
    shootGeneration,
    shootUid,
    shootAnnotations,
    getShootAnnotation,
    setShootAnnotation,
    unsetShootAnnotation,
    shootLabels,
    getShootLabel,
    setShootLabel,
    unsetShootLabel,
    shootCreatedAt,
    shootCreatedBy,
    shootConfirmationDeletion,
    isShootMarkedForDeletion,
    shootConfirmationForceDeletion,
    isShootMarkedForForceDeletion,
    isShootReconciliationDeactivated,
    isNewCluster,
    shootGardenerOperation,
    shootExpirationTimestamp,
    /* spec */
    shootSpec,
    shootPurpose,
    isTestingCluster,
    isShootActionsDisabledForPurpose,
    isShootSettingHibernated,
    shootSecretBindingName,
    shootCredentialsBindingName,
    shootCloudProviderBinding,
    shootK8sVersion,
    shootAvailableK8sUpdates,
    shootKubernetesVersionObject,
    shootSupportedPatchAvailable,
    shootSupportedUpgradeAvailable,
    shootCloudProfileRef,
    shootProviderType,
    shootWorkerGroups,
    hasShootWorkerGroups,
    sshAccessEnabled,
    shootAddons,
    shootRegion,
    shootZones,
    podsCidr,
    nodesCidr,
    servicesCidr,
    shootDomain,
    isCustomShootDomain,
    shootDnsPrimaryProvider,
    shootDnsServiceExtensionProviders,
    shootDnsProviders,
    shootHibernationSchedules,
    shootMaintenance,
    shootControlPlaneHighAvailabilityFailureTolerance,
    shootSeedName,
    shootResources,
    /* status */
    shootStatus,
    isShootStatusHibernated,
    isShootLastOperationTypeDelete,
    isShootLastOperationTypeControlPlaneMigrating,
    shootLastOperationTypeControlPlaneMigrationMessage,
    shootLastOperation,
    shootLastErrors,
    shootConditions,
    shootConstraints,
    shootCredentialsRotation,
    shootObservedGeneration,
    shootTechnicalId,
    lastMaintenance,
    isLastMaintenanceFailed,
    hibernationPossibleConstraint,
    isHibernationPossible,
    hibernationPossibleMessage,
    maintenancePreconditionSatisfiedConstraint,
    isMaintenancePreconditionSatisfied,
    maintenancePreconditionSatisfiedMessage,
    caCertificateValiditiesAcceptableConstraint,
    isCACertificateValiditiesAcceptable,
    caCertificateValiditiesAcceptableMessage,
    /* info */
    shootInfo,
    canLinkToSeed,
    /* others */
    shootAccessRestrictions: accessRestrictionList,
    isShootStatusHibernationProgressing,
    canForceDeleteShoot,
  }
}

export function useShootItem () {
  return inject('shoot-item', null)
}

export function useProvideShootItem (shootItem, options) {
  const composable = createShootItemComposable(shootItem, options)
  provide('shoot-item', composable)
  return composable
}
