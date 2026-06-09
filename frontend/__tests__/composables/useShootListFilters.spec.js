//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  createPinia,
  setActivePinia,
} from 'pinia'

import { useAuthnStore } from '@/store/authn'
import { useConfigStore } from '@/store/config'
import { useLocalStorageStore } from '@/store/localStorage'

import { useShootListFilters } from '@/composables/useShootListFilters'

// Disable createSharedComposable so each test gets a fresh composable instance
vi.mock('@vueuse/core', async importOriginal => {
  const actual = await importOriginal()
  return {
    ...actual,
    createSharedComposable: fn => fn,
  }
})

describe('composables', () => {
  describe('useShootListFilters', () => {
    let authnStore
    let configStore
    let localStorageStore

    beforeEach(() => {
      setActivePinia(createPinia())
      authnStore = useAuthnStore()
      configStore = useConfigStore()
      localStorageStore = useLocalStorageStore()
      localStorageStore.allProjectsShootFilter = {}
    })

    it('should return empty labels when onlyShootsWithIssues is false', () => {
      authnStore.user = { isAdmin: true }
      localStorageStore.allProjectsShootFilter = {
        onlyShootsWithIssues: false,
        progressing: true,
        noOperatorAction: true,
      }

      const { activeFilterLabels } = useShootListFilters()
      expect(activeFilterLabels.value).toEqual([])
    })

    it('should return active filter labels for admin defaults', () => {
      authnStore.user = { isAdmin: true }

      const { activeFilterLabels } = useShootListFilters()
      expect(activeFilterLabels.value).toEqual([
        'Progressing Clusters',
        'User Errors',
        'Tickets with Ignore Labels',
      ])
    })

    it('should return only progressing for non-admin defaults', () => {
      authnStore.user = { isAdmin: false }

      const { activeFilterLabels } = useShootListFilters()
      // non-admin defaults: onlyShootsWithIssues=false, so no labels
      expect(activeFilterLabels.value).toEqual([])
    })

    it('should return labels matching locally stored filters', () => {
      authnStore.user = { isAdmin: true }
      localStorageStore.allProjectsShootFilter = {
        onlyShootsWithIssues: true,
        progressing: true,
        noOperatorAction: false,
        hideTicketsWithLabel: false,
      }

      const { activeFilterLabels } = useShootListFilters()
      expect(activeFilterLabels.value).toEqual([
        'Progressing Clusters',
      ])
    })

    it('should exclude hideTicketsWithLabel when ticket config is missing', () => {
      authnStore.user = { isAdmin: true }
      configStore.setConfiguration({ ticket: {} })
      localStorageStore.allProjectsShootFilter = {
        onlyShootsWithIssues: true,
        progressing: false,
        noOperatorAction: false,
        hideTicketsWithLabel: true,
      }

      const { activeFilterLabels } = useShootListFilters()
      expect(activeFilterLabels.value).toEqual([])
    })

    it('should include hideTicketsWithLabel when ticket config is present', () => {
      authnStore.user = { isAdmin: true }
      configStore.setConfiguration({
        ticket: {
          gitHubRepoUrl: 'https://github.com/org/repo',
          hideClustersWithLabels: ['ignore'],
        },
      })
      localStorageStore.allProjectsShootFilter = {
        onlyShootsWithIssues: true,
        progressing: false,
        noOperatorAction: false,
        hideTicketsWithLabel: true,
      }

      const { activeFilterLabels } = useShootListFilters()
      expect(activeFilterLabels.value).toEqual([
        'Tickets with Ignore Labels',
      ])
    })
  })
})
