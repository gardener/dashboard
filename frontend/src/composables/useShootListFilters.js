//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { computed } from 'vue'
import { createSharedComposable } from '@vueuse/core'

import { useAuthzStore } from '@/store/authz'
import { useConfigStore } from '@/store/config'
import { useLocalStorageStore } from '@/store/localStorage'

import pick from 'lodash/pick'

const FILTER_LABELS = [
  { key: 'progressing', label: 'Progressing Clusters' },
  { key: 'noOperatorAction', label: 'User Errors' },
  { key: 'ignoredTickets', label: 'Tickets with Ignore Labels' },
]

const FILTER_KEYS = [
  'healthy',
  'progressing',
  'noOperatorAction',
  'ignoredTickets',
]

function getDefaultAllProjectsShootFilters (canViewLandscape) {
  return {
    healthy: canViewLandscape,
    progressing: true,
    noOperatorAction: canViewLandscape,
    ignoredTickets: canViewLandscape,
  }
}

export function getUnhealthyFilterMaskFromShootListFilters (shootListFilters = {}) {
  if (!shootListFilters.healthy) {
    return 0
  }

  let mask = 0
  if (shootListFilters.progressing) {
    mask |= 1
  }
  if (shootListFilters.noOperatorAction) {
    mask |= 2
  }
  if (shootListFilters.ignoredTickets) {
    mask |= 4
  }
  return mask
}

export const useShootListFilters = createSharedComposable(function useShootListFilters () {
  const authzStore = useAuthzStore()
  const configStore = useConfigStore()
  const localStorageStore = useLocalStorageStore()

  const shootListFilters = computed({
    get () {
      const filters = {
        ...getDefaultAllProjectsShootFilters(authzStore.canViewLandscape),
        ...pick(localStorageStore.allProjectsShootFilter, FILTER_KEYS),
      }

      const { ticket } = configStore
      if (ticket && (!ticket.gitHubRepoUrl || !ticket.hideClustersWithLabels?.length)) {
        filters.ignoredTickets = false
      }

      return filters
    },
    set (value) {
      localStorageStore.allProjectsShootFilter = pick(value, FILTER_KEYS)
    },
  })

  const healthy = computed(() => {
    return shootListFilters.value.healthy ?? true
  })

  function toggleShootListFilter (key) {
    shootListFilters.value = {
      ...shootListFilters.value,
      [key]: !shootListFilters.value[key], // eslint-disable-line security/detect-object-injection -- key is a fixed set of strings, not user input
    }
  }

  const unhealthyFilterMask = computed(() => {
    return getUnhealthyFilterMaskFromShootListFilters(shootListFilters.value)
  })

  const activeFilterLabels = computed(() => {
    const filters = shootListFilters.value
    if (!filters.healthy) {
      return []
    }

    return FILTER_LABELS
      .filter(({ key }) => filters[key]) // eslint-disable-line security/detect-object-injection -- key is a fixed set of strings, not user input
      .map(({ label }) => label)
  })

  return {
    shootListFilters,
    healthy,
    toggleShootListFilter,
    unhealthyFilterMask,
    activeFilterLabels,
  }
})
