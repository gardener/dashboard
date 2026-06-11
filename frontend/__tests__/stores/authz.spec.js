//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  setActivePinia,
  createPinia,
} from 'pinia'

import { useAuthzStore } from '@/store/authz'
import { useAuthnStore } from '@/store/authn'

import { useApi } from '@/composables/useApi'

function createRulesResponse (resourceRules = []) {
  return {
    data: {
      resourceRules,
    },
  }
}

describe('stores', () => {
  describe('authz', () => {
    const api = useApi()
    let authzStore
    let authnStore
    let mockGetSubjectRules

    beforeEach(() => {
      setActivePinia(createPinia())
      authzStore = useAuthzStore()
      authnStore = useAuthnStore()
      mockGetSubjectRules = vi.spyOn(api, 'getSubjectRules')
    })

    describe('canViewLandscape', () => {
      it('should return true when user can list seeds (SSRR) and list shoots cluster-wide (JWT)', async () => {
        authnStore.user = { canListShootsAllNamespaces: true }
        const rules = [{
          apiGroups: ['core.gardener.cloud'],
          resources: ['seeds'],
          verbs: ['list'],
        }]
        mockGetSubjectRules.mockResolvedValueOnce(createRulesResponse(rules))
        await authzStore.fetchRules()
        expect(authzStore.canViewLandscape).toBe(true)
      })

      it('should return false when user can list seeds but not shoots cluster-wide', async () => {
        authnStore.user = { canListShootsAllNamespaces: false }
        const rules = [{
          apiGroups: ['core.gardener.cloud'],
          resources: ['seeds'],
          verbs: ['list'],
        }]
        mockGetSubjectRules.mockResolvedValueOnce(createRulesResponse(rules))
        await authzStore.fetchRules()
        expect(authzStore.canViewLandscape).toBe(false)
      })

      it('should return false when user can list shoots cluster-wide but not seeds', async () => {
        authnStore.user = { canListShootsAllNamespaces: true }
        mockGetSubjectRules.mockResolvedValueOnce(createRulesResponse([]))
        await authzStore.fetchRules()
        expect(authzStore.canViewLandscape).toBe(false)
      })

      it('should return false when SSRR shows list shoots in namespace but JWT lacks cluster-wide', async () => {
        authnStore.user = { canListShootsAllNamespaces: false }
        const rules = [
          {
            apiGroups: ['core.gardener.cloud'],
            resources: ['seeds'],
            verbs: ['list'],
          },
          {
            apiGroups: ['core.gardener.cloud'],
            resources: ['shoots'],
            verbs: ['list'],
          },
        ]
        mockGetSubjectRules.mockResolvedValueOnce(createRulesResponse(rules))
        await authzStore.fetchRules('garden-foo')
        expect(authzStore.canViewLandscape).toBe(false)
      })

      it('should return false when seed stats are not accessible', async () => {
        authnStore.user = { canListShootsAllNamespaces: false }
        const gardenRules = [
          {
            apiGroups: ['seedmanagement.gardener.cloud'],
            resources: ['managedseeds'],
            verbs: ['get'],
          },
          {
            apiGroups: ['core.gardener.cloud'],
            resources: ['shoots'],
            verbs: ['get'],
          },
        ]

        mockGetSubjectRules.mockResolvedValueOnce(createRulesResponse(gardenRules))
        await authzStore.fetchGardenRules()

        expect(authzStore.canViewLandscape).toBe(false)
      })
    })
  })
})
