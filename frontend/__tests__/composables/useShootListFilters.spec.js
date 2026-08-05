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
import { buildSearchTerms } from '@/store/shoot/search'

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
      configStore.setConfiguration({
        ticket: {
          gitHubRepoUrl: 'https://github.com/org/repo',
          hideClustersWithLabels: ['ignore'],
        },
      })
      mockGetSubjectRules = vi.spyOn(api, 'getSubjectRules')
      mockGetSubjectRules.mockResolvedValue(createRulesResponse())
      localStorageStore.allProjectsShootFilter = {}
      localStorageStore.allProjectsShootDefaultView = null
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

    it('should not return active filter reasons when all clusters is the default', async () => {
      await grantLandscapeAccess()
      localStorageStore.allProjectsShootDefaultView = 'all'
      localStorageStore.allProjectsShootFilter = {
        progressing: true,
        operatorAction: true,
        allTicketsIgnored: false,
      }

      const { activeFilterReasons } = useShootListFilters()
      expect(activeFilterReasons.value).toEqual([])
    })

    it('should preserve Operations View criteria when all clusters is the default', async () => {
      await grantLandscapeAccess()
      localStorageStore.allProjectsShootDefaultView = 'all'
      localStorageStore.allProjectsShootFilter = {
        progressing: true,
        operatorAction: true,
        allTicketsIgnored: true,
      }

      const {
        defaultClusterView,
        operationsViewFilters,
        shootListFilters,
      } = useShootListFilters()

      expect(defaultClusterView.value).toBe('all')
      expect(buildSearchTerms(shootListFilters.value)).toBe('')
      expect(buildSearchTerms(operationsViewFilters.value)).toBe(
        'health:unhealthy progressing:false operatorAction:true allTicketsIgnored:false',
      )

      defaultClusterView.value = 'operations'
      expect(buildSearchTerms(shootListFilters.value)).toBe(
        'health:unhealthy progressing:false operatorAction:true allTicketsIgnored:false',
      )
    })

    it('should return active filter reasons for landscape defaults', async () => {
      await grantLandscapeAccess()

      const { activeFilterReasons } = useShootListFilters()
      expect(activeFilterReasons.value).toEqual([
        'are progressing',
        'do not require operator action',
        'have only ignored tickets',
      ])
    })

    it('should return reasons matching locally stored filters', async () => {
      await grantLandscapeAccess()
      localStorageStore.allProjectsShootFilter = {
        progressing: true,
        operatorAction: false,
        allTicketsIgnored: false,
      }

      const { activeFilterReasons } = useShootListFilters()
      expect(activeFilterReasons.value).toEqual([
        'are progressing',
      ])
    })

    it.each([
      { description: 'missing', configuration: {} },
      { description: 'incomplete', configuration: { ticket: {} } },
    ])('should exclude allTicketsIgnored when ticket config is $description', async ({ configuration }) => {
      await grantLandscapeAccess()
      configStore.setConfiguration(configuration)
      localStorageStore.allProjectsShootFilter = {
        progressing: false,
        operatorAction: false,
        allTicketsIgnored: true,
      }

      const { activeFilterReasons } = useShootListFilters()
      expect(activeFilterReasons.value).toEqual([])
    })

    it('should include allTicketsIgnored when ticket config is present', async () => {
      await grantLandscapeAccess()
      configStore.setConfiguration({
        ticket: {
          gitHubRepoUrl: 'https://github.com/org/repo',
          hideClustersWithLabels: ['ignore'],
        },
      })
      localStorageStore.allProjectsShootFilter = {
        progressing: false,
        operatorAction: false,
        allTicketsIgnored: true,
      }

      const { activeFilterReasons } = useShootListFilters()
      expect(activeFilterReasons.value).toEqual([
        'have only ignored tickets',
      ])
    })

    it('should keep healthy clusters excluded from Operations View criteria', async () => {
      await grantLandscapeAccess()
      localStorageStore.allProjectsShootFilter = {
        healthy: false,
        progressing: false,
        operatorAction: false,
        allTicketsIgnored: false,
      }

      const { operationsViewFilters } = useShootListFilters()

      expect(operationsViewFilters.value).toEqual({
        healthy: true,
        progressing: false,
        operatorAction: false,
        allTicketsIgnored: false,
      })
    })

    it('should update Operations View criteria through dedicated setters', async () => {
      await grantLandscapeAccess()
      localStorageStore.allProjectsShootFilter = {
        progressing: false,
        operatorAction: false,
        allTicketsIgnored: false,
      }

      const {
        setHideProgressing,
        setHideWithoutOperatorAction,
        setHideAllTicketsIgnored,
      } = useShootListFilters()

      setHideProgressing(true)
      setHideWithoutOperatorAction(true)
      setHideAllTicketsIgnored(true)

      expect(localStorageStore.allProjectsShootFilter).toEqual({
        progressing: true,
        operatorAction: true,
        allTicketsIgnored: true,
      })

      setHideProgressing(true)
      expect(localStorageStore.allProjectsShootFilter.progressing).toBe(true)
    })

    it('should default non-landscape users to all clusters', () => {
      const {
        defaultClusterView,
        operationsViewFilters,
        shootListFilters,
      } = useShootListFilters()

      expect(defaultClusterView.value).toBe('all')
      expect(operationsViewFilters.value.healthy).toBe(true)
      expect(shootListFilters.value.healthy).toBe(false)
    })

    it('should ignore stored landscape filters for non-landscape users', () => {
      localStorageStore.allProjectsShootDefaultView = 'operations'
      localStorageStore.allProjectsShootFilter = {
        progressing: true,
        operatorAction: true,
        allTicketsIgnored: true,
      }

      const {
        operationsViewFilters,
        shootListFilters,
      } = useShootListFilters()

      const expectedFilters = {
        healthy: true,
        progressing: false,
        operatorAction: false,
        allTicketsIgnored: false,
      }
      expect(operationsViewFilters.value).toEqual(expectedFilters)
      expect(shootListFilters.value).toEqual(expectedFilters)
    })
  })
})
