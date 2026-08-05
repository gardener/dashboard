//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { computed } from 'vue'

import {
  buildSearchTerms,
  resolveShootListFiltersForDonut,
} from '@/store/shoot/search'

import { useShootListFilters } from '@/composables/useShootListFilters'

export function createSeedShootListRoute (seedName, shootListFilters) {
  const terms = [`seed:"${seedName}"`]

  if (shootListFilters) {
    const filters = resolveShootListFiltersForDonut(shootListFilters)
    terms.push(buildSearchTerms(filters))
  }

  const search = terms.filter(Boolean).join(' ')

  return {
    name: 'ShootList',
    params: {
      namespace: '_all',
    },
    query: {
      q: search,
    },
  }
}

export function useSeedShootListNavigation (seedName) {
  const {
    activeFilterReasons,
    shootListFilters,
  } = useShootListFilters()

  const assignedShootsRoute = computed(() => {
    return createSeedShootListRoute(seedName.value)
  })

  const unhealthyShootsRoute = computed(() => {
    return createSeedShootListRoute(seedName.value, shootListFilters.value)
  })

  return {
    activeFilterReasons,
    assignedShootsRoute,
    unhealthyShootsRoute,
  }
}
