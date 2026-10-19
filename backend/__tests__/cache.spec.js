//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  describe,
  it,
  expect,
  vi,
  afterEach,
  beforeEach,
} from 'vitest'
import { Store } from '@gardener-dashboard/kube-client'
import cacheModule from '../lib/cache/index.js'

const cache = cacheModule
const { cache: internalCache } = cacheModule

describe('cache', function () {
  afterEach(() => {
    internalCache.clear()
  })

  it('should dispatch "synchronize" to internal cache', function () {
    const stub = vi.spyOn(internalCache, 'set')
    const a = { store: { id: 1 } }
    const b = { store: { id: 2 } }
    cache.initialize({ a, b })
    expect(stub).toHaveBeenCalledTimes(2)
    expect(stub.mock.calls).toEqual([
      ['a', { id: 1 }],
      ['b', { id: 2 }],
    ])
  })

  it('should dispatch "getCloudProfiles" to internal cache', function () {
    const list = []
    const stub = vi.spyOn(internalCache, 'getCloudProfiles').mockReturnValue(list)
    expect(cache.getCloudProfiles()).toBe(list)
    expect(stub).toHaveBeenCalledTimes(1)
  })

  it('should dispatch "getQuotas" to internal cache', function () {
    const list = []
    const stub = vi.spyOn(internalCache, 'getQuotas').mockReturnValue(list)
    expect(cache.getQuotas()).toBe(list)
    expect(stub).toHaveBeenCalledTimes(1)
  })

  it('should dispatch "getSeeds" to internal cache', function () {
    const list = []
    const stub = vi.spyOn(internalCache, 'getSeeds').mockReturnValue(list)
    expect(cache.getSeeds()).toBe(list)
    expect(stub).toHaveBeenCalledTimes(1)
  })

  it('should dispatch "getProjects" to internal cache', function () {
    const list = []
    const stub = vi.spyOn(internalCache, 'getProjects').mockReturnValue(list)
    expect(cache.getProjects()).toBe(list)
    expect(stub).toHaveBeenCalledTimes(1)
  })

  it('should dispatch "getShoots" to internal cache', function () {
    const list = [
      { metadata: { uid: 1, namespace: 'foo' } },
      { metadata: { uid: 2, namespace: 'bar' } },
    ]
    const store = new Store()
    store.replace(list)
    internalCache.set('shoots', store)
    expect(cache.getShoots('_all')).toEqual(list)
    expect(cache.getShoots('foo')).toEqual(list.slice(0, 1))
    expect(cache.getShoots('bar')).toEqual(list.slice(1, 2))
    expect(() => cache.getShoots()).toThrow(TypeError)
  })

  it('should look up "getShoot" in the namespace index', function () {
    const handlers = new Map()
    internalCache.indexShootsByNamespace({
      on (event, handler) {
        handlers.set(event, handler)
      },
    })
    const shoots = fixtures.shoots.list()
    for (const shoot of shoots) {
      handlers.get('add')(shoot)
    }
    const [shoot] = shoots
    expect(cache.getShoot('garden-foo', 'fooShoot')).toBe(shoot)
    expect(cache.getShoot('garden', 'fooShoot')).toBeUndefined()
    expect(cache.getShoot('garden-missing', 'fooShoot')).toBeUndefined()

    handlers.get('delete')(shoot)
    expect(cache.getShoot('garden-foo', 'fooShoot')).toBeUndefined()
  })

  it('should look up "getSeed" by name without copying', function () {
    const store = new Store()
    const seeds = fixtures.seeds.list()
    store.replace(seeds)
    internalCache.set('seeds', store)
    const seed = seeds.at(-1)
    expect(cache.getSeed(seed.metadata.name)).toBe(seed)
    expect(cache.getSeed('missing-seed')).toBeUndefined()
  })

  it.each([
    ['getProjectByUid', 'projects', () => fixtures.projects.list()],
    ['getSeedByUid', 'seeds', () => fixtures.seeds.list()],
    ['getShootByUid', 'shoots', () => fixtures.shoots.list()],
    ['getManagedSeedByUid', 'managedseeds', () => fixtures.managedseeds.list()],
  ])('should look up "%s" by store key', function (method, key, list) {
    const store = new Store()
    const items = list()
    store.replace(items)
    internalCache.set(key, store)
    const object = items.at(-1)
    expect(cache[method](object.metadata.uid)).toBe(object)
    expect(cache[method]('missing-uid')).toBeUndefined()
  })

  it('should dispatch "getControllerRegistrations" to internal cache', function () {
    const list = []
    const stub = vi.spyOn(internalCache, 'getControllerRegistrations').mockReturnValue(list)
    expect(cache.getControllerRegistrations()).toBe(list)
    expect(stub).toHaveBeenCalledTimes(1)
  })

  it('should dispatch "getResourceQuotas" to internal cache', function () {
    const list = []
    const stub = vi.spyOn(internalCache, 'getResourceQuotas').mockReturnValue(list)
    expect(cache.getResourceQuotas()).toBe(list)
    expect(stub).toHaveBeenCalledTimes(1)
  })

  describe('Cache', function () {
    const Cache = internalCache.constructor
    let cache

    beforeEach(function () {
      cache = new Cache()
    })

    describe('#getTicketCache', function () {
      it('should return the ticket cache', function () {
        expect(cache.size).toBe(0)
        expect(cache.getTicketCache()).toBe(cache.ticketCache)
      })
    })

    describe('#getShootsBySeedName', function () {
      it('should return an empty iterable when no shoots are indexed for the seed', function () {
        expect(Array.from(cache.getShootsBySeedName('missing-seed'))).toEqual([])
      })

      it('should return indexed shoots for the given seed name', function () {
        const handlers = new Map()
        cache.indexShootsBySeedName({
          on (event, handler) {
            handlers.set(event, handler)
          },
        })

        const add = handlers.get('add')
        for (const shoot of fixtures.shoots.list()) {
          add(shoot)
        }

        expect(Array.from(cache.getShootsBySeedName('infra1-seed'))).toHaveLength(3)
        expect(Array.from(cache.getShootsBySeedName('soil-infra1'))).toHaveLength(1)
      })
    })

    it('should maintain the shoot namespace index across add, update, and delete', () => {
      const handlers = new Map()
      cache.indexShootsByNamespace({
        on (event, handler) {
          handlers.set(event, handler)
        },
      })
      const oldShoot = {
        metadata: {
          name: 'shoot-1',
          namespace: 'garden-foo',
          uid: 'shoot-1',
        },
      }
      const newShoot = {
        metadata: {
          name: 'shoot-1',
          namespace: 'garden-bar',
          uid: 'shoot-1',
        },
      }

      handlers.get('add')(oldShoot)
      expect(cache.getShoot('garden-foo', 'shoot-1')).toBe(oldShoot)

      handlers.get('update')(newShoot, oldShoot)
      expect(cache.getShoot('garden-foo', 'shoot-1')).toBeUndefined()
      expect(cache.getShoot('garden-bar', 'shoot-1')).toBe(newShoot)

      handlers.get('delete')(newShoot)
      expect(cache.getShoot('garden-bar', 'shoot-1')).toBeUndefined()
    })
  })
})
