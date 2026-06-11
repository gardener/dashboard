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
import { useAuthzStore } from '@/store/authz'
import { useConfigStore } from '@/store/config'
import { useLocalStorageStore } from '@/store/localStorage'

import { useApi } from '@/composables/useApi'
import { useShootListFilters } from '@/composables/useShootListFilters'

// Disable createSharedComposable so each test gets a fresh composable instance
vi.mock('@vueuse/core', async importOriginal => {
  const actual = await importOriginal()
  return {
    ...actual,
    createSharedComposable: fn => fn,
  }
})

function createRulesResponse (resourceRules = []) {
  return {
    data: {
      resourceRules,
    },
  }
}

describe('composables', () => {
  describe('useShootListFilters', () => {
    const api = useApi()

    let authnStore
    let authzStore
    let configStore
    let localStorageStore
    let mockGetSubjectRules

    beforeEach(() => {
      setActivePinia(createPinia())
      authnStore = useAuthnStore()
      authzStore = useAuthzStore()
      configStore = useConfigStore()
      localStorageStore = useLocalStorageStore()
      mockGetSubjectRules = vi.spyOn(api, 'getSubjectRules')
      mockGetSubjectRules.mockResolvedValue(createRulesResponse())
      localStorageStore.allProjectsShootFilter = {}
    })

    async function grantLandscapeAccess () {
      authnStore.user = { canListShootsAllNamespaces: true }
      const clusterRules = [{
        apiGroups: ['core.gardener.cloud'],
        resources: ['seeds'],
        verbs: ['list'],
      }]
      mockGetSubjectRules.mockResolvedValueOnce(createRulesResponse(clusterRules))
      await authzStore.fetchRules()
    }

    it('should return empty labels when onlyShootsWithIssues is false', async () => {
      await grantLandscapeAccess()
      localStorageStore.allProjectsShootFilter = {
        onlyShootsWithIssues: false,
        progressing: true,
        noOperatorAction: true,
      }

      const { activeFilterLabels } = useShootListFilters()
      expect(activeFilterLabels.value).toEqual([])
    })

    it('should return active filter labels for landscape defaults', async () => {
      await grantLandscapeAccess()

      const { activeFilterLabels } = useShootListFilters()
      expect(activeFilterLabels.value).toEqual([
        'Progressing Clusters',
        'User Errors',
        'Tickets with Ignore Labels',
      ])
    })

    it('should return empty labels without landscape access', () => {
      const { activeFilterLabels } = useShootListFilters()
      expect(activeFilterLabels.value).toEqual([])
    })

    it('should return labels matching locally stored filters', async () => {
      await grantLandscapeAccess()
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

    it('should exclude hideTicketsWithLabel when ticket config is missing', async () => {
      await grantLandscapeAccess()
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

    it('should include hideTicketsWithLabel when ticket config is present', async () => {
      await grantLandscapeAccess()
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
