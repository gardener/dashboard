//
// SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { useObjectMetadata } from './useObjectMetadata'

export const useProjectMetadata = (projectItem, options = {}) => {
  const {
    name: projectName,
    creationTimestamp: projectCreationTimestamp,
    deletionTimestamp: projectDeletionTimestamp,
    generation: projectGeneration,
    uid: projectUid,
    createdBy: projectCreatedBy,
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

  return {
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
  }
}
