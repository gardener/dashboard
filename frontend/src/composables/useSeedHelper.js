//
// SPDX-FileCopyrightText: 2025 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  computed,
  inject,
  isRef,
  provide,
} from 'vue'

import { useConfigStore } from '@/store/config'

import isMatch from 'lodash/isMatch'

export function createSeedHelperComposable (seedItem, options = {}) {
  if (!isRef(seedItem)) {
    throw new TypeError('First argument `seedItem` must be a ref object')
  }

  const {
    configStore = useConfigStore(),
  } = options

  const isSeedUnreachable = computed(() => {
    const matchLabels = configStore.unreachableSeeds.value?.matchLabels
    if (!matchLabels) {
      return false
    }
    return isMatch(seedItem.value, { metadata: { labels: matchLabels } })
  })

  return {
    isSeedUnreachable,
  }
}

export function useSeedHelper () {
  return inject('seed-helper', null)
}

export function useProvideSeedHelper (seedItem, options) {
  const composable = createSeedHelperComposable(seedItem, options)
  provide('seed-helper', composable)
  return composable
}
