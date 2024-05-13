//
// SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { computed } from 'vue'

import { useProjectStore } from '@/store/project'

import utils from '@/utils'

import {
  get,
  set,
  unset,
} from '@/lodash'

export const useShootMetadata = (shootItem, options = {}) => {
  const {
    projectStore = useProjectStore(),
  } = options

  const shootMetadata = computed(() => {
    return get(shootItem.value, 'metadata', {})
  })

  const shootNamespace = computed(() => {
    return get(shootItem.value, 'metadata.namespace', projectStore.namespace)
  })

  const shootProjectName = computed(() => {
    return projectStore.projectNameByNamespace(shootNamespace.value)
  })

  const shootCreationTimestamp = computed(() => {
    return get(shootItem.value, 'metadata.creationTimestamp')
  })

  const shootDeletionTimestamp = computed(() => {
    return get(shootItem.value, 'metadata.deletionTimestamp')
  })

  const shootGeneration = computed(() => {
    return get(shootItem.value, 'metadata.generation')
  })

  const shootUid = computed(() => {
    return get(shootItem.value, 'metadata.uid')
  })

  const shootName = computed({
    get () {
      return get(shootItem.value, 'metadata.name')
    },
    set (value) {
      set(shootItem.value, 'metadata.name', value)
    },
  })

  const shootAnnotations = computed(() => {
    return get(shootItem.value, 'metadata.annotations', {})
  })

  function getShootAnnotation (key, defaultValue) {
    return get(shootItem.value, `metadata.annotations['${key}']`, defaultValue)
  }

  function setShootAnnotation (key, value) {
    set(shootItem.value, `metadata.annotations['${key}']`, value)
  }

  function unsetShootAnnotation (key) {
    unset(shootItem.value, `metadata.annotations['${key}']`)
  }

  const shootLabels = computed(() => {
    return get(shootItem.value, 'metadata.labels', {})
  })

  function getShootLabel (key, defaultValue) {
    return get(shootItem.value, `metadata.labels['${key}']`, `${defaultValue}`)
  }

  function setShootLabel (key, value) {
    set(shootItem.value, `metadata.labels['${key}']`, `${value}`)
  }

  function unsetShootLabel (key) {
    unset(shootItem.value, `metadata.labels['${key}']`)
  }

  const shootCreatedBy = computed(() => {
    return utils.getCreatedBy(shootMetadata.value)
  })

  const shootCreatedAt = computed(() => {
    return utils.getTimestampFormatted(shootCreationTimestamp.value)
  })

  const shootConfirmationDeletion = computed(() => {
    return utils.isTruthyValue(getShootAnnotation('confirmation.gardener.cloud/deletion'))
  })

  const isShootMarkedForDeletion = computed(() => {
    return (shootConfirmationForceDeletion.value || shootConfirmationDeletion.value) && !!shootDeletionTimestamp.value
  })

  const shootConfirmationForceDeletion = computed(() => {
    return utils.isTruthyValue(getShootAnnotation('confirmation.gardener.cloud/force-deletion'))
  })

  const isShootMarkedForForceDeletion = computed(() => {
    return shootConfirmationForceDeletion.value && !!shootDeletionTimestamp.value
  })

  const isShootReconciliationDeactivated = computed(() => {
    return utils.isReconciliationDeactivated(shootMetadata.value)
  })

  const isNewCluster = computed(() => {
    return !shootCreationTimestamp.value
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
