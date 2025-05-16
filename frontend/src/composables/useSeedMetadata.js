//
// SPDX-FileCopyrightText: 2025 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { useObjectMetadata } from './useObjectMetadata'

export const useSeedMetadata = (seedItem, options = {}) => {
  const {
    name: seedName,
    creationTimestamp: seedCreationTimestamp,
    deletionTimestamp: seedDeletionTimestamp,
    generation: seedGeneration,
    uid: seedUid,
    createdAt: seedCreatedAt,
    metadata: seedMetadata,
    annotations: seedAnnotations,
    getAnnotation: getSeedAnnotation,
    labels: seedLabels,
    getLabel: getSeedLabel,
  } = useObjectMetadata(seedItem)

  return {
    seedMetadata,
    seedName,
    seedCreationTimestamp,
    seedDeletionTimestamp,
    seedGeneration,
    seedUid,
    seedAnnotations,
    getSeedAnnotation,
    seedLabels,
    getSeedLabel,
    seedCreatedAt,
  }
}
