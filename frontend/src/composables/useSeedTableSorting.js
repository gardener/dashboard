//
// SPDX-FileCopyrightText: Contributors to the Gardener project
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

function compareUnhealthyShoots (a, b, compareValues) {
  if (a == null && b == null) {return 0}
  if (a == null) {return -1}
  if (b == null) {return 1}

  return compareValues(a.unhealthy, b.unhealthy) ||
    compareValues(a.otherUnhealthy, b.otherUnhealthy) ||
    compareValues(a.healthy, b.healthy)
}

export function useSeedTableSorting () {
  const configStore = useConfigStore()

  const {
    compareValues,
    compareSemanticVersions,
  } = useTableSorting()

  const customKeySort = {
    name: compareValues,
    infrastructure: compareValues,
    shootCount: compareValues,
    unhealthyShoots: (a, b) => compareUnhealthyShoots(a, b, compareValues),
    lastOperation: (a, b) => compareLastOperation(a, b, compareValues),
    kubernetesVersion: compareSemanticVersions,
    gardenerVersion: compareSemanticVersions,
    shoot: compareValues,
    createdAt: compareValues,
    readiness: (a, b) => compareReadiness(a, b, configStore),
  }

  return {
    customKeySort,
  }
}
