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

import { useProjectMetadata } from './useProjectMetadata'
import { useProjectShootCustomFields } from './useProjectShootCustomFields'

import { get } from '@/lodash'

export function createProjectItemComposable (projectItem, options = {}) {
  if (!isRef(projectItem)) {
    throw new TypeError('First argument `projectItem` must be a ref object')
  }

  const {
    projectMetadata,
    projectName,
    projectCreationTimestamp,
    projectDeletionTimestamp,
    projectGeneration,
    projectUid,
    projectAnnotations,
    getProjectAnnotation,
    setProjectAnnotation,
    unsetProjectAnnotation,
    projectLabels,
    getProjectLabel,
    setProjectLabel,
    unsetProjectLabel,
    projectCreatedAt,
    isNewProject,
  } = useProjectMetadata(projectItem)

  const {
    shootCustomFields,
  } = useProjectShootCustomFields(projectItem)

  const projectCostObject = computed(() => {
    return getProjectAnnotation('billing.gardener.cloud/costObject', '')
  })
  const projectCreatedBy = computed(() => {
    return get(projectItem.value, 'data.createdBy', '')
  })
  const projectOwner = computed(() => {
    return get(projectItem.value, 'data.owner', '')
  })
  const projectDescription = computed(() => {
    return get(projectItem.value, 'data.description', '')
  })
  const projectPurpose = computed(() => {
    return get(projectItem.value, 'data.purpose', '')
  })
  const projectStaleSinceTimestamp = computed(() => {
    return get(projectItem.value, 'data.staleSinceTimestamp')
  })
  const projectStaleAutoDeleteTimestamp = computed(() => {
    return get(projectItem.value, 'data.staleAutoDeleteTimestamp')
  })
  const projectPhase = computed(() => {
    return get(projectItem.value, 'data.phase')
  })

  return {
    projectItem,
    /* metadata */
    projectMetadata,
    projectName,
    projectCreationTimestamp,
    projectDeletionTimestamp,
    projectGeneration,
    projectUid,
    projectAnnotations,
    getProjectAnnotation,
    setProjectAnnotation,
    unsetProjectAnnotation,
    projectLabels,
    getProjectLabel,
    setProjectLabel,
    unsetProjectLabel,
    projectCreatedAt,
    projectCostObject,
    /* data */
    projectCreatedBy,
    isNewProject,
    projectOwner,
    projectDescription,
    projectPurpose,
    projectStaleSinceTimestamp,
    projectStaleAutoDeleteTimestamp,
    projectPhase,
    /* others */
    shootCustomFields,
  }
}

export function useProjectItem () {
  return inject('project-item', null)
}

export function useProvideProjectItem (projectItem, options) {
  const composable = createProjectItemComposable(projectItem, options)
  provide('project-item', composable)
  return composable
}
