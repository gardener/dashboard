//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { useConfigStore } from '@/store/config'

import {
  getLastOperationSortVal as getLastOperationSortValBase,
  getReadinessSortVal,
} from '@/composables/useTableSorting/helper'

import { useTableSorting } from './useTableSorting'

import get from 'lodash/get'

function compareReadiness (a, b, configStore) {
  const aConditions = get(a, ['status', 'conditions'], [])
  const bConditions = get(b, ['status', 'conditions'], [])
  const aLastOperationTime = get(a, ['status', 'lastOperation', 'lastUpdateTime'])
  const bLastOperationTime = get(b, ['status', 'lastOperation', 'lastUpdateTime'])
  const aCreationTime = get(a, ['metadata', 'creationTimestamp'])
  const bCreationTime = get(b, ['metadata', 'creationTimestamp'])
  const isErrorFn = status => status !== 'True'

  const aVal = getReadinessSortVal({
    conditions: aConditions,
    lastOperationTime: aLastOperationTime,
    creationTime: aCreationTime,
    isErrorFn,
    configStore,
  })
  const bVal = getReadinessSortVal({
    conditions: bConditions,
    lastOperationTime: bLastOperationTime,
    creationTime: bCreationTime,
    isErrorFn,
    configStore,
  })

  return aVal.localeCompare(bVal, undefined, { numeric: true, sensitivity: 'base' })
}

function getSeedLastOperationSortVal (item) {
  return getLastOperationSortValBase({
    operation: item.status?.lastOperation,
    metadata: item.metadata,
    status: item.status,
    isUserErrorFn: () => false,
  })
}

function compareLastOperation (a, b, compareValues) {
  return compareValues(getSeedLastOperationSortVal(a), getSeedLastOperationSortVal(b))
}

function compareControlPlaneHighAvailability (a, b, compareValues) {
  const getFailureToleranceTypeRank = value => {
    const failureToleranceType = value?.failureToleranceType
    return failureToleranceType === 'node'
      ? 1
      : 0
  }

  const compareFailureToleranceType = compareValues(
    getFailureToleranceTypeRank(a),
    getFailureToleranceTypeRank(b),
  )
  if (compareFailureToleranceType !== 0) {
    return compareFailureToleranceType
  }

  return compareValues(a?.name, b?.name)
}

export function useSeedTableSorting (options = {}) {
  const {
    defaultSortBy = [{ key: 'name', order: 'asc' }],
    onSortChange,
  } = options

  const configStore = useConfigStore()

  const {
    sortBy,
    compareValues,
    compareSemanticVersions,
  } = useTableSorting({
    defaultSortBy,
    onSortChange,
  })

  const customKeySort = {
    name: (a, b) => compareValues(a, b),
    infrastructure: (a, b) => compareValues(a, b),
    lastOperation: (a, b) => compareLastOperation(a, b, compareValues),
    kubernetesVersion: (a, b) => compareSemanticVersions(a, b),
    gardenerVersion: (a, b) => compareSemanticVersions(a, b),
    shoots: (a, b) => compareValues(a, b),
    createdAt: (a, b) => compareValues(a, b),
    readiness: (a, b) => compareReadiness(a, b, configStore),
    controlPlaneHighAvailability: (a, b) => compareControlPlaneHighAvailability(a, b, compareValues),
  }

  return {
    sortBy,
    customKeySort,
  }
}
