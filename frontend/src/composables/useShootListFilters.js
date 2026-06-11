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
  { key: 'hideTicketsWithLabel', label: 'Tickets with Ignore Labels' },
]

const FILTER_KEYS = [
  'onlyShootsWithIssues',
  'progressing',
  'noOperatorAction',
  'hideTicketsWithLabel',
]

function getDefaultAllProjectsShootFilters (canViewLandscape) {
  return {
    onlyShootsWithIssues: canViewLandscape,
    progressing: true,
    noOperatorAction: canViewLandscape,
    hideTicketsWithLabel: canViewLandscape,
  }
}

export function getUnhealthyFilterMaskFromShootListFilters (shootListFilters = {}) {
  if (!shootListFilters.onlyShootsWithIssues) {
    return 0
  }

  let mask = 0
  if (shootListFilters.progressing) {
    mask |= 1
  }
  if (shootListFilters.noOperatorAction) {
    mask |= 2
  }
  if (shootListFilters.hideTicketsWithLabel) {
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
        ...localStorageStore.allProjectsShootFilter,
      }

      const { ticket } = configStore
      if (ticket && (!ticket.gitHubRepoUrl || !ticket.hideClustersWithLabels?.length)) {
        filters.hideTicketsWithLabel = false
      }

      return filters
    },
    set (value) {
      localStorageStore.allProjectsShootFilter = pick(value, FILTER_KEYS)
    },
  })

  const onlyShootsWithIssues = computed(() => {
    return shootListFilters.value.onlyShootsWithIssues ?? true
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
    if (!filters.onlyShootsWithIssues) {
      return []
    }

    return FILTER_LABELS
      .filter(({ key }) => filters[key]) // eslint-disable-line security/detect-object-injection -- key is a fixed set of strings, not user input
      .map(({ label }) => label)
  })

  return {
    shootListFilters,
    onlyShootsWithIssues,
    toggleShootListFilter,
    unhealthyFilterMask,
    activeFilterLabels,
  }
})
