//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  ref,
  watch,
} from 'vue'
import { useUrlSearchParams } from '@vueuse/core'

import get from 'lodash/get'
import set from 'lodash/set'

/**
 * Composable for syncing a search query with URL parameters
 */
export function useUrlSearchSync (options = {}) {
  const {
    paramName = 'q',
    mode = 'hash-params',
    initialValue = '',
  } = options

  const params = useUrlSearchParams(mode)
  const search = ref(get(params, [paramName]) ?? initialValue)

  // Watch URL changes (browser back/forward, direct URL change)
  watch(() => get(params, [paramName]), value => {
    if (search.value !== value) {
      search.value = value ?? ''
    }
  })

  // Watch search changes (user input)
  watch(search, value => {
    const trimmedValue = value?.trim()
    if (!trimmedValue) {
      set(params, [paramName], null) // Remove param from URL when empty
    } else if (get(params, [paramName]) !== trimmedValue) {
      set(params, [paramName], trimmedValue)
    }
  })

  return {
    search,
  }
}
