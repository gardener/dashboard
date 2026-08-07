//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  computed,
  readonly,
} from 'vue'
import { createSharedComposable } from '@vueuse/core'

import { useAuthzStore } from '@/store/authz'
import { useConfigStore } from '@/store/config'
import { useLocalStorageStore } from '@/store/localStorage'
import { resolveShootListFiltersForDonut } from '@/store/shoot/search'

import pick from 'lodash/pick'

const OPERATIONS_VIEW_EXCLUSION_CRITERIA = [
  { key: 'progressing', exclusionReason: 'are progressing', label: 'Progressing' },
  { key: 'operatorAction', exclusionReason: 'do not require operator action', label: 'User Errors' },
  { key: 'allTicketsIgnored', exclusionReason: 'have only ignored tickets', label: 'Ignored Ticket Labels' },
]

const FILTER_KEYS = [
  'progressing',
  'operatorAction',
  'allTicketsIgnored',
]

const ALL_CLUSTERS_FILTERS = {
  healthy: false,
  progressing: false,
  operatorAction: false,
  allTicketsIgnored: false,
}

export function getEnabledOperationsViewExclusionReasons (shootListFilters = {}) {
  return OPERATIONS_VIEW_EXCLUSION_CRITERIA
    .filter(({ key }) => shootListFilters[key]) // eslint-disable-line security/detect-object-injection -- key is a fixed set of strings, not user input
    .map(({ exclusionReason }) => exclusionReason)
}

function getDefaultAllProjectsShootFilters (canViewLandscape) {
  return {
    healthy: true,
    progressing: canViewLandscape,
    operatorAction: canViewLandscape,
    allTicketsIgnored: canViewLandscape,
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
  if (shootListFilters.operatorAction) {
    mask |= 2
  }
  if (shootListFilters.allTicketsIgnored) {
    mask |= 4
  }
  return mask
}

export const useShootListFilters = createSharedComposable(function useShootListFilters () {
  const authzStore = useAuthzStore()
  const configStore = useConfigStore()
  const localStorageStore = useLocalStorageStore()

  const operationsViewFilters = computed({
    get () {
      const storedFilters = authzStore.canViewLandscape
        ? pick(localStorageStore.allProjectsShootFilter, FILTER_KEYS)
        : {} // Prevent saved settings leaking into filters regular users cannot configure
      const filters = {
        ...getDefaultAllProjectsShootFilters(authzStore.canViewLandscape),
        ...storedFilters,
      }

      const { ticket } = configStore
      if (!ticket?.gitHubRepoUrl || !ticket.hideClustersWithLabels?.length) {
        filters.allTicketsIgnored = false
      }

      return filters
    },
    set (value) {
      localStorageStore.allProjectsShootFilter = pick(value, FILTER_KEYS)
    },
  })

  const defaultClusterView = computed({
    get () {
      return localStorageStore.allProjectsShootDefaultView ?? (
        authzStore.canViewLandscape ? 'operations' : 'all'
      )
    },
    set (value) {
      localStorageStore.allProjectsShootDefaultView = value
    },
  })

  const shootListFilters = computed(() => {
    return defaultClusterView.value === 'operations'
      ? operationsViewFilters.value
      : ALL_CLUSTERS_FILTERS
  })

  function setOperationsViewFilter (key, value) {
    operationsViewFilters.value = {
      ...operationsViewFilters.value,
      [key]: value,
    }
  }

  function setHideProgressing (value) {
    setOperationsViewFilter('progressing', value)
  }

  function setHideWithoutOperatorAction (value) {
    setOperationsViewFilter('operatorAction', value)
  }

  function setHideAllTicketsIgnored (value) {
    setOperationsViewFilter('allTicketsIgnored', value)
  }

  const healthy = computed(() => shootListFilters.value.healthy ?? true)

  function toggleShootListFilter (key) {
    if (key === 'healthy') {
      defaultClusterView.value = healthy.value ? 'all' : 'operations'
      return
    }

    setOperationsViewFilter(key, !operationsViewFilters.value[key]) // eslint-disable-line security/detect-object-injection -- key is a fixed set of strings, not user input
  }

  const unhealthyFilterMask = computed(() => {
    return getUnhealthyFilterMaskFromShootListFilters(shootListFilters.value)
  })

  const activeFilterReasons = computed(() => {
    const effective = resolveShootListFiltersForDonut(shootListFilters.value)
    return getEnabledOperationsViewExclusionReasons(effective)
  })

  // Retained until the existing Shoot/Seed list presentations are replaced by
  // the Operations View controls in their dedicated follow-up tasks.
  const activeFilterLabels = computed(() => {
    if (!healthy.value) {
      return []
    }

    return OPERATIONS_VIEW_EXCLUSION_CRITERIA
      .filter(({ key }) => shootListFilters.value[key]) // eslint-disable-line security/detect-object-injection -- key is a fixed set of strings, not user input
      .map(({ label }) => label)
  })

  return {
    shootListFilters,
    operationsViewFilters: readonly(operationsViewFilters),
    defaultClusterView,
    healthy,
    toggleShootListFilter,
    setHideProgressing,
    setHideWithoutOperatorAction,
    setHideAllTicketsIgnored,
    unhealthyFilterMask,
    activeFilterReasons,
    activeFilterLabels,
  }
})
