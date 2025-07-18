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

import { useProjectMetadata } from '@/composables/useProjectMetadata'
import { useProjectShootCustomFields } from '@/composables/useProjectShootCustomFields'
import { useProjectCostObject } from '@/composables/useProjectCostObject'

import get from 'lodash/get'

export function createProjectItemComposable (projectItem) {
  if (!isRef(projectItem)) {
    throw new TypeError('First argument `projectItem` must be a ref object')
  }

  const {
    projectMetadata,
    projectName,
    projectTitle,
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

  /* costObject */
  const {
    costObject,
    costObjectType,
    costObjectsSettingEnabled,
    costObjectDescriptionHtml,
    costObjectTitle,
    costObjectRegex,
    costObjectErrorMessage,
  } = useProjectCostObject(projectItem)

  /* spec */
  const projectNamespace = useProjectNamespace(projectItem)
  const projectCreatedBy = computed(() => {
    return get(projectItem.value, ['spec', 'createdBy', 'name'], '')
  })
  const projectOwner = computed(() => {
    return get(projectItem.value, ['spec', 'owner', 'name'], '')
  })
  const projectDescription = computed(() => {
    return get(projectItem.value, ['spec', 'description'], '')
  })
  const projectPurpose = computed(() => {
    return get(projectItem.value, ['spec', 'purpose'], '')
  })

  /* status */
  const projectStaleSinceTimestamp = useProjectStaleSinceTimestamp(projectItem)
  const projectStaleAutoDeleteTimestamp = useProjectStaleAutoDeleteTimestamp(projectItem)
  const projectPhase = useProjectPhase(projectItem)

  return {
    projectItem,
    /* metadata */
    projectMetadata,
    projectName,
    projectTitle,
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
    /* spec */
    projectNamespace,
    projectCreatedBy,
    isNewProject,
    projectOwner,
    projectDescription,
    projectPurpose,
    /* status */
    projectStaleSinceTimestamp,
    projectStaleAutoDeleteTimestamp,
    projectPhase,
    /* costObject */
    costObject,
    costObjectType,
    costObjectsSettingEnabled,
    costObjectDescriptionHtml,
    costObjectTitle,
    costObjectRegex,
    costObjectErrorMessage,
    /* others */
    shootCustomFields,
  }
}

export function useProjectItem () {
  return inject('project-item', null)
}

export function useProvideProjectItem (projectItem) {
  const composable = createProjectItemComposable(projectItem)
  provide('project-item', composable)
  return composable
}

/* spec */
export function useProjectNamespace (projectItem) {
  return computed(() => {
    return get(projectItem.value, ['spec', 'namespace'], '')
  })
}

/* status */
export function useProjectStaleSinceTimestamp (projectItem) {
  return computed(() => {
    return get(projectItem.value, ['status', 'staleSinceTimestamp'])
  })
}

export function useProjectStaleAutoDeleteTimestamp (projectItem) {
  return computed(() => {
    return get(projectItem.value, ['status', 'staleAutoDeleteTimestamp'])
  })
}

export function useProjectPhase (projectItem) {
  return computed(() => {
    return get(projectItem.value, ['status', 'phase'], '')
  })
}
