//
// SPDX-FileCopyrightText: Copyright Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  createApp,
  effectScope,
} from 'vue'
import {
  createMemoryHistory,
  createRouter,
  isNavigationFailure,
  NavigationFailureType,
} from 'vue-router'

import {
  isSameRouteIgnoringShallowQuery,
  useShallowRouteSearchQuery,
} from '@/composables/useRouteSearchQuery'

function createRouteContext () {
  const routerHistory = createMemoryHistory()
  const router = createRouter({
    history: routerHistory,
    routes: [
      {
        name: 'ShootList',
        path: '/namespace/:namespace/shoots',
        component: {},
      },
      {
        name: 'SeedList',
        path: '/seeds',
        component: {},
      },
      {
        name: 'Settings',
        path: '/settings',
        component: {},
      },
    ],
  })
  const app = createApp({})
  app.use(router)

  function useSearchQuery (options) {
    return app.runWithContext(() => useShallowRouteSearchQuery(options))
  }

  return {
    router,
    routerHistory,
    useSearchQuery,
  }
}

function resolveHistoryLocation (router, routerHistory) {
  return router.resolve(routerHistory.location)
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

describe('composables', () => {
  describe('useShallowRouteSearchQuery', () => {
    it('uses the router provided to the app', async () => {
      const { router, useSearchQuery } = createRouteContext()
      await router.push({
        name: 'SeedList',
        query: {
          q: 'provider:aws',
        },
      })

      const { searchQuery } = useSearchQuery()

      expect(searchQuery.value).toBe('provider:aws')
    })

    it('initializes from the actual history location instead of stale router state', async () => {
      const { router, routerHistory, useSearchQuery } = createRouteContext()
      await router.push({
        name: 'ShootList',
        params: {
          namespace: '_all',
        },
        query: {
          q: 'provider:aws',
        },
      })

      const actualLocation = router.resolve({
        name: 'ShootList',
        params: {
          namespace: '_all',
        },
        query: {
          q: 'seed:first-seed',
        },
      })
      routerHistory.replace(actualLocation.fullPath)

      const { searchQuery } = useSearchQuery()

      expect(router.currentRoute.value.query.q).toBe('provider:aws')
      expect(searchQuery.value).toBe('seed:first-seed')
    })

    it('bases shallow writes on the actual history location instead of stale router state', async () => {
      const { router, routerHistory, useSearchQuery } = createRouteContext()
      await router.push({
        name: 'ShootList',
        params: {
          namespace: '_all',
        },
        query: {
          q: 'provider:aws',
          view: 'stale',
        },
        hash: '#stale',
      })
      const staleFullPath = router.currentRoute.value.fullPath

      const actualLocation = router.resolve({
        name: 'SeedList',
        query: {
          q: 'seed:first-seed',
          namespace: 'garden-myproject',
        },
        hash: '#actual',
      })
      routerHistory.replace(actualLocation.fullPath)
      const { searchQuery } = useSearchQuery()

      searchQuery.value = 'seed:latest'

      const expected = router.resolve({
        name: 'SeedList',
        query: {
          q: 'seed:latest',
          namespace: 'garden-myproject',
        },
        hash: '#actual',
      })
      expect(routerHistory.location).toBe(expected.fullPath)
      expect(router.currentRoute.value.fullPath).toBe(staleFullPath)
    })

    it('shallowly writes router-canonical encoding and preserves surrounding whitespace without running navigation', async () => {
      const { router, routerHistory, useSearchQuery } = createRouteContext()
      await router.push({
        name: 'ShootList',
        params: {
          namespace: '_all',
        },
        query: {
          q: 'provider:aws',
          view: 'compact',
        },
        hash: '#details',
      })

      const beforeGuard = vi.fn()
      router.beforeEach(beforeGuard)
      const push = vi.spyOn(router, 'push')
      const replace = vi.spyOn(router, 'replace')
      const historyReplace = vi.spyOn(routerHistory, 'replace')
      const onWrite = vi.fn()
      const onRouteCommitted = vi.fn()
      const scope = effectScope()
      const { searchQuery } = scope.run(() => {
        return useSearchQuery({
          onWrite,
          onRouteCommitted,
        })
      })
      const search = '  name:"a b" plus:a+b foo&bar=baz#urgent percent:% equal:a=b unicode:Grüße  '

      searchQuery.value = search

      const expected = router.resolve({
        name: 'ShootList',
        params: {
          namespace: '_all',
        },
        query: {
          q: search,
          view: 'compact',
        },
        hash: '#details',
      })
      expect(routerHistory.location).toBe(expected.fullPath)
      expect(resolveHistoryLocation(router, routerHistory).query).toEqual({
        q: search,
        view: 'compact',
      })
      expect(searchQuery.value).toBe(search)
      expect(router.currentRoute.value.query.q).toBe('provider:aws')
      expect(historyReplace).toHaveBeenCalledWith(expected.fullPath)
      expect(push).not.toHaveBeenCalled()
      expect(replace).not.toHaveBeenCalled()
      expect(beforeGuard).not.toHaveBeenCalled()
      expect(onWrite).toHaveBeenCalledWith(search)
      expect(onRouteCommitted).not.toHaveBeenCalled()
      scope.stop()
    })

    it('notifies active consumers after rehydrating from a committed route', async () => {
      const { router, useSearchQuery } = createRouteContext()
      await router.push({
        name: 'SeedList',
        query: {
          q: 'provider:aws',
        },
      })

      const committedRoutes = []
      const onRouteCommitted = vi.fn((search, route) => {
        committedRoutes.push({
          search,
          route,
          liveSearch: searchQuery.value,
        })
      })
      const scope = effectScope()
      const { searchQuery } = scope.run(() => {
        return useSearchQuery({
          onRouteCommitted,
        })
      })

      await router.push({
        name: 'ShootList',
        params: {
          namespace: '_all',
        },
        query: {
          q: 'seed:latest',
        },
      })

      expect(onRouteCommitted).toHaveBeenCalledTimes(1)
      expect(committedRoutes).toEqual([
        {
          search: 'seed:latest',
          route: router.currentRoute.value,
          liveSearch: 'seed:latest',
        },
      ])

      await router.push({
        name: 'ShootList',
        params: {
          namespace: 'garden-local',
        },
        query: {
          q: 'seed:latest',
        },
      })

      expect(onRouteCommitted).toHaveBeenCalledTimes(2)
      expect(committedRoutes[1]).toEqual({
        search: 'seed:latest',
        route: router.currentRoute.value,
        liveSearch: 'seed:latest',
      })
      scope.stop()
    })

    it('does not notify disposed consumers or notify after canceled navigation', async () => {
      const { router, useSearchQuery } = createRouteContext()
      await router.push({
        name: 'SeedList',
        query: {
          q: 'provider:aws',
        },
      })

      const activeCallback = vi.fn()
      const disposedCallback = vi.fn()
      const disposedScope = effectScope()
      disposedScope.run(() => {
        useSearchQuery({
          onRouteCommitted: disposedCallback,
        })
      })
      disposedScope.stop()
      const activeScope = effectScope()
      activeScope.run(() => {
        useSearchQuery({
          onRouteCommitted: activeCallback,
        })
      })
      router.beforeEach(to => to.name !== 'Settings')

      const failure = await router.push({ name: 'Settings' })

      expect(isNavigationFailure(failure, NavigationFailureType.aborted)).toBe(true)
      expect(activeCallback).not.toHaveBeenCalled()
      expect(disposedCallback).not.toHaveBeenCalled()

      await router.push({
        name: 'ShootList',
        params: {
          namespace: '_all',
        },
      })

      expect(activeCallback).toHaveBeenCalledWith('', router.currentRoute.value)
      expect(disposedCallback).not.toHaveBeenCalled()
      activeScope.stop()
    })

    it('rejects route commit listeners outside an active scope', () => {
      const { useSearchQuery } = createRouteContext()

      expect(() => {
        useSearchQuery({
          onRouteCommitted: vi.fn(),
        })
      }).toThrow(
        'useShallowRouteSearchQuery with onRouteCommitted must be called within an active Vue scope',
      )
    })

    it('preserves an explicitly empty search as q=', async () => {
      const { router, routerHistory, useSearchQuery } = createRouteContext()
      await router.push({
        name: 'SeedList',
        query: {
          q: 'provider:aws',
        },
      })
      const { searchQuery } = useSearchQuery()

      searchQuery.value = ''

      const actualRoute = resolveHistoryLocation(router, routerHistory)
      expect(Object.hasOwn(actualRoute.query, 'q')).toBe(true)
      expect(actualRoute.query.q).toBe('')
      expect(routerHistory.location).toBe('/seeds?q=')
      expect(searchQuery.value).toBe('')
    })

    it('retains a shallow edit when navigating away and back', async () => {
      const { router, routerHistory, useSearchQuery } = createRouteContext()
      await router.push({
        name: 'ShootList',
        params: {
          namespace: '_all',
        },
        query: {
          q: 'provider:aws',
        },
      })
      const { searchQuery } = useSearchQuery()

      searchQuery.value = 'seed:latest'
      const editedLocation = routerHistory.location
      await router.push({ name: 'Settings' })

      expect(searchQuery.value).toBe('')

      await waitForRoute(router, 'ShootList', () => router.back())

      expect(routerHistory.location).toBe(editedLocation)
      expect(router.currentRoute.value.query.q).toBe('seed:latest')
      expect(searchQuery.value).toBe('seed:latest')
    })

    it('leaves live search and the shallow URL untouched after cancellation', async () => {
      const { router, routerHistory, useSearchQuery } = createRouteContext()
      await router.push({
        name: 'ShootList',
        params: {
          namespace: '_all',
        },
        query: {
          q: 'provider:aws',
        },
      })
      const { searchQuery } = useSearchQuery()
      searchQuery.value = 'seed:latest'
      const editedLocation = routerHistory.location
      router.beforeEach(to => to.name !== 'Settings')

      const failure = await router.push({ name: 'Settings' })

      expect(isNavigationFailure(failure, NavigationFailureType.aborted)).toBe(true)
      expect(routerHistory.location).toBe(editedLocation)
      expect(searchQuery.value).toBe('seed:latest')
    })

    it('keeps rehydrating after the component scope that created the state stops', async () => {
      const { router, routerHistory, useSearchQuery } = createRouteContext()
      const donutSearch = 'seed:"az-ha1" health:unhealthy progressing:false operatorAction:true allTicketsIgnored:false'
      await router.push({
        name: 'SeedList',
        query: {
          namespace: 'garden-myproject',
        },
      })

      const seedListScope = effectScope()
      let seedSearch
      seedListScope.run(() => {
        seedSearch = useSearchQuery().searchQuery
      })
      seedListScope.stop()

      await router.push({
        name: 'ShootList',
        params: {
          namespace: '_all',
        },
        query: {
          q: donutSearch,
        },
      })

      const shootListScope = effectScope()
      let shootSearch
      shootListScope.run(() => {
        shootSearch = useSearchQuery().searchQuery
      })
      expect(shootSearch.value).toBe(donutSearch)

      shootSearch.value = 'health:unhealthy progressing:false operatorAction:true allTicketsIgnored:false'
      shootListScope.stop()

      await waitForRoute(router, 'SeedList', () => router.back())

      const returnedSeedListScope = effectScope()
      returnedSeedListScope.run(() => {
        seedSearch = useSearchQuery().searchQuery
      })
      expect(routerHistory.location).toBe('/seeds?namespace=garden-myproject')
      expect(seedSearch.value).toBe('')

      seedSearch.value = 'my-seed'
      returnedSeedListScope.stop()

      await router.push({
        name: 'ShootList',
        params: {
          namespace: 'garden-myproject',
        },
      })

      const projectShootListScope = effectScope()
      projectShootListScope.run(() => {
        shootSearch = useSearchQuery().searchQuery
      })
      expect(shootSearch.value).toBe('')
      projectShootListScope.stop()
    })
  })

  describe('isSameRouteIgnoringShallowQuery', () => {
    it('normalizes non-search query key order when comparing routes', () => {
      const { router } = createRouteContext()
      const current = router.resolve({
        name: 'ShootList',
        params: {
          namespace: '_all',
        },
        query: {
          view: 'compact',
          namespace: 'garden-local',
          q: 'stale search',
        },
      })

      expect(isSameRouteIgnoringShallowQuery(router, current, {
        name: 'ShootList',
        params: {
          namespace: '_all',
        },
        query: {
          namespace: 'garden-local',
          view: 'compact',
          q: 'current search',
        },
      })).toBe(true)
    })

    it('ignores only q when comparing resolved routes', () => {
      const { router } = createRouteContext()
      const current = router.resolve({
        name: 'ShootList',
        params: {
          namespace: '_all',
        },
        query: {
          q: 'stale search',
          view: 'compact',
        },
        hash: '#details',
      })

      expect(isSameRouteIgnoringShallowQuery(router, current, {
        name: 'ShootList',
        params: {
          namespace: '_all',
        },
        query: {
          view: 'compact',
        },
        hash: '#details',
      })).toBe(true)
      expect(isSameRouteIgnoringShallowQuery(router, current, {
        name: 'ShootList',
        params: {
          namespace: 'garden-local',
        },
        query: {
          view: 'compact',
        },
        hash: '#details',
      })).toBe(false)
      expect(isSameRouteIgnoringShallowQuery(router, current, {
        name: 'ShootList',
        params: {
          namespace: '_all',
        },
        query: {
          view: 'full',
        },
        hash: '#details',
      })).toBe(false)
    })
  })
})
