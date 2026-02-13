//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  computed,
  isRef,
} from 'vue'

export function useTableFilter (options = {}) {
  const {
    items,
    searchQuery,
    filterFn,
  } = options

  if (!isRef(items)) {
    throw new TypeError('items must be a ref object')
  }

  if (!isRef(searchQuery)) {
    throw new TypeError('searchQuery must be a ref object')
  }

  if (!filterFn || typeof filterFn !== 'function') {
    throw new Error('useTableFilter: filterFn option is required and must be a function')
  }

  const filteredItems = computed(() => {
    const query = searchQuery.value?.trim()

    if (!query) {
      return items.value
    }

    return items.value.filter(item => filterFn(item, query))
  })

  return {
    filteredItems,
  }
}
