//
// SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { computed } from 'vue'

import { useProjectStore } from '@/store/project'

import {
  isTruthyValue,
  isReconciliationDeactivated,
} from '@/utils'

import { useObjectMetadata } from './useObjectMetadata'

export const useShootMetadata = (shootItem, options = {}) => {
  const {
    projectStore = useProjectStore(),
  } = options

  const {
    namespace,
    name: shootName,
    creationTimestamp: shootCreationTimestamp,
    deletionTimestamp: shootDeletionTimestamp,
    generation: shootGeneration,
    uid: shootUid,
    createdAt: shootCreatedAt,
    createdBy: shootCreatedBy,
    isNew: isNewCluster,
    metadata: shootMetadata,
    annotations: shootAnnotations,
    getAnnotation: getShootAnnotation,
    setAnnotation: setShootAnnotation,
    unsetAnnotation: unsetShootAnnotation,
    labels: shootLabels,
    getLabel: getShootLabel,
    setLabel: setShootLabel,
    unsetLabel: unsetShootLabel,
  } = useObjectMetadata(shootItem)

  const shootNamespace = computed(() => {
    return namespace.value ?? projectStore.namespace
  })

  const shootProjectName = computed(() => {
    return projectStore.projectNameByNamespace(shootNamespace.value)
  })

  const shootProjectTitle = computed(() => {
    return projectStore.projectTitleByNamespace(shootNamespace.value)
  })

  const shootProject = computed(() => {
    return projectStore.projectByNamespace(shootNamespace.value)
  })

  const shootConfirmationDeletion = computed(() => {
    return isTruthyValue(getShootAnnotation('confirmation.gardener.cloud/deletion'))
  })

  const isShootMarkedForDeletion = computed(() => {
    return (shootConfirmationForceDeletion.value || shootConfirmationDeletion.value) && !!shootDeletionTimestamp.value
  })

  const shootConfirmationForceDeletion = computed(() => {
    return isTruthyValue(getShootAnnotation('confirmation.gardener.cloud/force-deletion'))
  })

  const isShootMarkedForForceDeletion = computed(() => {
    return shootConfirmationForceDeletion.value && !!shootDeletionTimestamp.value
  })

  const isShootReconciliationDeactivated = computed(() => {
    return isReconciliationDeactivated(shootMetadata.value)
  })

  const shootGardenerOperation = computed(() => {
    return getShootAnnotation('gardener.cloud/operation')
  })

  const shootExpirationTimestamp = computed(() => {
    return getShootAnnotation('shoot.gardener.cloud/expiration-timestamp') ?? getShootAnnotation('shoot.garden.sapcloud.io/expirationTimestamp')
  })

  return {
    shootMetadata,
    shootNamespace,
    shootName,
    shootProjectName,
    shootProjectTitle,
    shootProject,
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
  }
}
