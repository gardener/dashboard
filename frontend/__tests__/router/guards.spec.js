//
// SPDX-FileCopyrightText: Contributors to the Gardener project
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

import { useAppStore } from '@/store/app'
import { useAuthnStore } from '@/store/authn'
import { useAuthzStore } from '@/store/authz'
import { useProjectStore } from '@/store/project'
import { useShootStore } from '@/store/shoot'

import { useShallowRouteSearchQuery } from '@/composables/useRouteSearchQuery'

import {
  createGlobalAfterHooks,
  createGlobalBeforeGuards,
  createGlobalResolveGuards,
} from '@/router/guards'

function createTestRouter () {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        name: 'AllClusters',
        path: '/clusters',
        component: {},
        meta: { namespace: '_all' },
      },
      {
        name: 'ShootList',
        path: '/projects/:projectName/clusters',
        component: {},
        beforeEnter (to) {
          to.meta.namespace = `garden-${to.params.projectName}`
        },
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
  it('treats the _all Project name like any inaccessible Project', async () => {
    setActivePinia(createPinia())
    const appStore = useAppStore()
    const [, ensureDataLoaded] = createGlobalResolveGuards()

    await ensureDataLoaded({
      name: 'ShootList',
      meta: { projectScoped: true },
      params: { projectName: '_all' },
    })

    expect(appStore.routerError).toMatchObject({
      status: 403,
      reason: 'Forbidden',
    })
  })

  it('prepares remembered Project rules before committing a global route', async () => {
    setActivePinia(createPinia())
    const authzStore = useAuthzStore()
    const projectStore = useProjectStore()
    projectStore.list = [{
      metadata: { name: 'source' },
      spec: { namespace: 'garden-source' },
      status: { phase: 'Ready' },
    }]
    projectStore.rememberProject('source')
    const prepareRules = vi.spyOn(authzStore, 'prepareRules').mockResolvedValue()
    const [, ensureDataLoaded] = createGlobalResolveGuards()

    await ensureDataLoaded({ name: 'SeedList', meta: {} })

    expect(prepareRules).toHaveBeenNthCalledWith(1, null)
    expect(prepareRules).toHaveBeenNthCalledWith(2, 'garden-source')
  })

  it('redirects direct navigation to a Pending Project', async () => {
    setActivePinia(createPinia())
    const projectStore = useProjectStore()
    projectStore.list = [{
      metadata: { name: 'pending' },
      spec: { namespace: 'garden-pending' },
      status: { phase: 'Pending' },
    }]
    const [, ensureDataLoaded] = createGlobalResolveGuards()

    await expect(ensureDataLoaded({
      name: 'ShootList',
      meta: { projectScoped: true },
      params: { projectName: 'pending' },
    })).resolves.toEqual({
      name: 'ProjectList',
      replace: true,
    })
  })

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
        name: 'AllClusters',
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

      await waitForRoute(router, 'AllClusters', () => router.back())

      expect(router.options.history.location).toBe(editedLocation)
      expect(authzStore.namespace).toBe('_all')
      expect(searchQuery.value).toBe('seed:latest')
      expect(shootStore.shootListContext).toEqual({
        namespace: '_all',
        search: 'seed:latest',
      })
    })

    it('ignores namespace query when activating global rules', async () => {
      const projectStore = useProjectStore()
      projectStore.list = [{
        metadata: { name: 'source' },
        spec: { namespace: 'garden-source' },
        status: { phase: 'Ready' },
      }]
      projectStore.rememberProject('source')

      await router.push({
        name: 'Settings',
        query: { namespace: 'garden-ignored' },
      })

      expect(authzStore.activateRules).toHaveBeenLastCalledWith(undefined, 'garden-source')
      expect(router.currentRoute.value.fullPath).toBe('/settings?namespace=garden-ignored')
    })

    it('keeps the source authorization, context, search, and URL after cancellation', async () => {
      await router.push({
        name: 'ShootList',
        params: {
          projectName: 'source',
        },
        query: {
          q: 'provider:aws',
        },
      })
      const { searchQuery } = useShootListSearch()
      searchQuery.value = 'seed:latest'
      const editedLocation = router.options.history.location
      router.beforeEach(to => to.params.projectName !== 'target')

      const failure = await router.push({
        name: 'ShootList',
        params: {
          projectName: 'target',
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

  describe('global before guard', () => {
    let authnStore

    function createAuthGuard () {
      return createGlobalBeforeGuards()[1]
    }

    beforeEach(() => {
      setActivePinia(createPinia())
      authnStore = useAuthnStore()
    })

    it('should wait for the asynchronous expiry result before allowing navigation', async () => {
      let resolveExpired
      vi.spyOn(authnStore, '$reset').mockResolvedValue()
      vi.spyOn(authnStore, 'isExpired').mockReturnValue(new Promise(resolve => {
        resolveExpired = () => resolve(false)
      }))

      const navigation = createAuthGuard()({
        meta: {},
        fullPath: '/namespace/foo',
      })

      let settled = false
      const pending = navigation.then(result => {
        settled = true
        return result
      })
      await Promise.resolve()
      expect(settled).toBe(false)

      resolveExpired()
      await expect(pending).resolves.toBe(true)
      expect(settled).toBe(true)
      expect(authnStore.$reset).toHaveBeenCalledTimes(1)
      expect(authnStore.isExpired).toHaveBeenCalledTimes(1)
    })

    it('should redirect to login after the session is known to be expired', async () => {
      let resolveExpired
      vi.spyOn(authnStore, '$reset').mockImplementation(async () => {
        authnStore.user = { id: 'john.doe' }
      })
      vi.spyOn(authnStore, 'isExpired').mockReturnValue(new Promise(resolve => {
        resolveExpired = () => resolve(true)
      }))

      const navigation = createAuthGuard()({
        meta: {},
        fullPath: '/namespace/foo',
      })

      let settled = false
      const pending = navigation.then(result => {
        settled = true
        return result
      })
      await Promise.resolve()
      expect(settled).toBe(false)

      resolveExpired()
      await expect(pending).resolves.toEqual({
        name: 'Login',
        query: {
          redirectPath: '/namespace/foo',
        },
      })
    })
  })
})
