//
// SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  isRef,
  inject,
  provide,
} from 'vue'

import { useProjectMetadata } from './useProjectMetadata'
import { useProjectShootCustomFields } from './useProjectShootCustomFields'

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
    projectCreatedBy,
    isNewProject,
  } = useProjectMetadata(projectItem)

  const {
    shootCustomFields,
  } = useProjectShootCustomFields(projectItem)

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
    projectCreatedBy,
    isNewProject,
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
