//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  ref,
  watch,
} from 'vue'
import semver from 'semver'

export function useTableSorting (options = {}) {
  const {
    defaultSortBy = [{ key: 'name', order: 'asc' }],
    onSortChange,
  } = options

  if (onSortChange && typeof onSortChange !== 'function') {
    throw new TypeError('onSortChange must be a function')
  }

  const sortBy = ref(defaultSortBy)

  function compareValues (aVal, bVal) {
    if (aVal == null && bVal == null) {
      return 0
    }
    if (aVal == null) {
      return 1
    }
    if (bVal == null) {
      return -1
    }

    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return aVal - bVal
    }

    if (aVal instanceof Date && bVal instanceof Date) {
      return aVal - bVal
    }

    // String comparison (case-insensitive)
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return aVal.localeCompare(bVal, undefined, {
        numeric: true,
        sensitivity: 'base',
      })
    }

    // Fallback
    return String(aVal).localeCompare(String(bVal), undefined, {
      numeric: true,
      sensitivity: 'base',
    })
  }

  function compareSemanticVersions (aVal, bVal) {
    if (aVal == null && bVal == null) {
      return 0
    }
    if (aVal == null) {
      return 1
    }
    if (bVal == null) {
      return -1
    }

    // Clean versions (removes 'v' prefix if present) and convert to string
    const aStr = semver.clean(String(aVal)) || String(aVal)
    const bStr = semver.clean(String(bVal)) || String(bVal)

    if (semver.valid(aStr) && semver.valid(bStr)) {
      return semver.compare(aStr, bStr)
    }

    // Fallback
    return aStr.localeCompare(bStr, undefined, {
      numeric: true,
      sensitivity: 'base',
    })
  }

  if (onSortChange) {
    watch(sortBy, newValue => {
      onSortChange(newValue)
    }, { deep: true })
  }

  return {
    sortBy,
    compareValues,
    compareSemanticVersions,
  }
}
