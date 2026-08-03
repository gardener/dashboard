//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  createMemoryHistory,
  createRouter,
  isNavigationFailure,
  NavigationFailureType,
} from 'vue-router'
import { createApp } from 'vue'
import {
  createPinia,
  setActivePinia,
} from 'pinia'

import { useAuthzStore } from '@/store/authz'
import { useShootStore } from '@/store/shoot'

import { useShallowRouteSearchQuery } from '@/composables/useRouteSearchQuery'

import { createGlobalAfterHooks } from '@/router/guards'

function createTestRouter () {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        name: 'ShootList',
        path: '/namespace/:namespace/shoots',
        component: {},
      },
      {
        name: 'Settings',
        path: '/settings',
        component: {},
      },
    ],
  })
}

async function waitForRoute (router, routeName, navigate) {
  const committed = new Promise(resolve => {
    const removeHook = router.afterEach(to => {
      if (to.name === routeName) {
        removeHook()
        resolve()
      }
    })
  })

  navigate()
  await committed
}

describe('router', () => {
  describe('global after hook', () => {
    let authzStore
    let app
    let router
    let shootStore

    beforeEach(() => {
      setActivePinia(createPinia())
      authzStore = useAuthzStore()
      shootStore = useShootStore()
      vi.spyOn(authzStore, 'activateRules').mockImplementation(namespace => {
        authzStore._setNamespace(namespace)
        return true
      })
      vi.spyOn(shootStore, 'subscribeShoots').mockResolvedValue()

      router = createTestRouter()
      app = createApp({})
      app.use(router)
      for (const hook of createGlobalAfterHooks()) {
        router.afterEach(hook)
      }
    })

    function useShootListSearch () {
      return app.runWithContext(() => useShallowRouteSearchQuery({
        onWrite (search) {
          shootStore.activateShootList({
            namespace: authzStore.namespace,
            search,
          })
        },
      }))
    }

    it('reactivates the latest shallow context after navigating away and Back', async () => {
      await router.push({
        name: 'ShootList',
        params: {
          namespace: '_all',
        },
        query: {
          q: 'provider:aws',
        },
      })
      const { searchQuery } = useShootListSearch()
      searchQuery.value = 'seed:latest'
      const editedLocation = router.options.history.location

      await router.push({ name: 'Settings' })

      expect(shootStore.shootListContext).toBeNull()
      expect(searchQuery.value).toBe('')

      await waitForRoute(router, 'ShootList', () => router.back())

      expect(router.options.history.location).toBe(editedLocation)
      expect(authzStore.namespace).toBe('_all')
      expect(searchQuery.value).toBe('seed:latest')
      expect(shootStore.shootListContext).toEqual({
        namespace: '_all',
        search: 'seed:latest',
      })
    })

    it('keeps the source authorization, context, search, and URL after cancellation', async () => {
      await router.push({
        name: 'ShootList',
        params: {
          namespace: 'garden-source',
        },
        query: {
          q: 'provider:aws',
        },
      })
      const { searchQuery } = useShootListSearch()
      searchQuery.value = 'seed:latest'
      const editedLocation = router.options.history.location
      router.beforeEach(to => to.params.namespace !== 'garden-target')

      const failure = await router.push({
        name: 'ShootList',
        params: {
          namespace: 'garden-target',
        },
      })

      expect(isNavigationFailure(failure, NavigationFailureType.aborted)).toBe(true)
      expect(router.options.history.location).toBe(editedLocation)
      expect(authzStore.namespace).toBe('garden-source')
      expect(searchQuery.value).toBe('seed:latest')
      expect(shootStore.shootListContext).toEqual({
        namespace: 'garden-source',
        search: 'seed:latest',
      })
    })
  })
})
