//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  createMemoryHistory,
  createRouter,
} from 'vue-router'

import { createSeedShootListRoute } from '@/composables/useSeedShootListNavigation'

describe('composables', () => {
  describe('useSeedShootListNavigation', () => {
    it('should create an assigned-shoots route with only the seed filter', () => {
      expect(createSeedShootListRoute('infra1-seed')).toEqual({
        name: 'ShootList',
        params: {
          namespace: '_all',
        },
        query: {
          q: 'seed:"infra1-seed"',
        },
      })
    })

    it('should not apply inactive refinements to an unhealthy-shoots route', () => {
      const shootListFilters = {
        healthy: false,
        progressing: true,
        operatorAction: true,
        allTicketsIgnored: false,
      }

      expect(createSeedShootListRoute('infra1-seed', shootListFilters)).toEqual({
        name: 'ShootList',
        params: {
          namespace: '_all',
        },
        query: {
          q: 'seed:"infra1-seed" health:unhealthy',
        },
      })
    })

    it('should include all enabled unhealthy sub-filters', () => {
      const shootListFilters = {
        healthy: true,
        progressing: true,
        operatorAction: true,
        allTicketsIgnored: true,
      }

      expect(createSeedShootListRoute('infra1-seed', shootListFilters).query.q).toBe(
        'seed:"infra1-seed" health:unhealthy progressing:false operatorAction:true allTicketsIgnored:false',
      )
    })

    it('should survive Vue Router encoding and decode to the intended search', () => {
      const router = createRouter({
        history: createMemoryHistory(),
        routes: [{
          name: 'ShootList',
          path: '/namespace/:namespace/shoots',
          component: {},
        }],
      })
      const route = createSeedShootListRoute('aws-ha', {
        healthy: true,
        progressing: true,
        operatorAction: true,
        allTicketsIgnored: true,
      })

      const href = router.resolve(route).href
      const searchParams = new URLSearchParams(href.split('?')[1])

      expect(href).toBe('/namespace/_all/shoots?q=seed:%22aws-ha%22+health:unhealthy+progressing:false+operatorAction:true+allTicketsIgnored:false')
      expect(searchParams.get('q')).toBe('seed:"aws-ha" health:unhealthy progressing:false operatorAction:true allTicketsIgnored:false')
    })
  })
})
