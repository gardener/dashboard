//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  createMemoryHistory,
  createRouter,
} from 'vue-router'

import {
  getShootListContext,
  normalizeShootListRoute,
} from '@/router/shootList'

const DEFAULT_SEARCH = 'health:unhealthy progressing:false operatorAction:true allTicketsIgnored:false'
const SHOOT_LIST_FILTERS = {
  healthy: true,
  progressing: true,
  operatorAction: true,
  allTicketsIgnored: true,
}

function createTestRouter () {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        name: 'AllClusters',
        path: '/clusters',
        component: {},
      },
      {
        name: 'ShootList',
        path: '/projects/:projectName/clusters',
        component: {},
      },
    ],
  })
}

describe('router', () => {
  describe('shoot list', () => {
    it('normalizes the All Clusters default into a query parameter', () => {
      const router = createTestRouter()
      const route = router.resolve({
        name: 'AllClusters',
      })

      const target = normalizeShootListRoute(route, SHOOT_LIST_FILTERS)
      const normalizedRoute = router.resolve(target)

      expect(normalizedRoute.href).toBe('/clusters?q=health:unhealthy+progressing:false+operatorAction:true+allTicketsIgnored:false')
      expect(getShootListContext(normalizedRoute)).toEqual({
        namespace: '_all',
        search: DEFAULT_SEARCH,
      })
    })

    it('normalizes the all-clusters default into an explicitly empty query parameter', () => {
      const router = createTestRouter()
      const route = router.resolve({
        name: 'AllClusters',
      })

      const target = normalizeShootListRoute(route, {
        healthy: false,
        progressing: false,
        operatorAction: false,
        allTicketsIgnored: false,
      })
      const normalizedRoute = router.resolve(target)

      expect(normalizedRoute.href).toBe('/clusters?q=')
      expect(getShootListContext(normalizedRoute)).toEqual({
        namespace: '_all',
        search: '',
      })
    })

    it('keeps an explicitly empty search instead of applying the default', () => {
      const router = createTestRouter()
      const route = router.resolve({
        name: 'AllClusters',
        query: {
          q: '',
        },
      })

      expect(normalizeShootListRoute(route, SHOOT_LIST_FILTERS)).toBeUndefined()
      expect(getShootListContext(route)).toEqual({
        namespace: '_all',
        search: '',
      })
    })

    it('does not add the all-projects default to a project route', () => {
      const router = createTestRouter()
      const route = router.resolve({
        name: 'ShootList',
        params: {
          projectName: 'local',
        },
      })
      route.meta.namespace = 'garden-local'

      expect(normalizeShootListRoute(route, SHOOT_LIST_FILTERS)).toBeUndefined()
      expect(getShootListContext(route)).toEqual({
        namespace: 'garden-local',
        search: '',
      })
    })

    it('delegates search encoding to Vue Router', () => {
      const router = createTestRouter()
      const search = 'name:a+b foo&bar=baz#urgent'
      const route = router.resolve({
        name: 'AllClusters',
        query: {
          q: search,
        },
      })

      expect(route.href).toBe('/clusters?q=name:a%2Bb+foo%26bar=baz%23urgent')
      expect(router.resolve(route.href).query.q).toBe(search)
    })
  })
})
