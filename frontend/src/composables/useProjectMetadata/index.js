//
// SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { computed } from 'vue'

import {
  formatProjectNameAndTitle,
  getProjectTitle,
} from '@/composables/useProjectMetadata/helper.js'

import { annotations } from '@/utils/annotations.js'

import { useObjectMetadata } from '../useObjectMetadata.js'

export const useProjectMetadata = (projectItem, options = {}) => {
  const {
    name: projectName,
    creationTimestamp: projectCreationTimestamp,
    deletionTimestamp: projectDeletionTimestamp,
    generation: projectGeneration,
    uid: projectUid,
    createdAt: projectCreatedAt,
    isNew: isNewProject,
    metadata: projectMetadata,
    annotations: projectAnnotations,
    getAnnotation: getProjectAnnotation,
    setAnnotation: setProjectAnnotation,
    unsetAnnotation: unsetProjectAnnotation,
    labels: projectLabels,
    getLabel: getProjectLabel,
    setLabel: setProjectLabel,
    unsetLabel: unsetProjectLabel,
  } = useObjectMetadata(projectItem)

  const projectTitle = computed({
    get () {
      return getProjectTitle(projectItem.value)
    },
    set (value) {
      setProjectAnnotation(annotations.projectTitle, value)
    },
  })

  const projectNameAndTitle = computed(() => {
    return formatProjectNameAndTitle(projectName.value, projectTitle.value)
  })

  return {
    projectMetadata,
    projectName,
    projectTitle,
    projectNameAndTitle,
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
  }
}
