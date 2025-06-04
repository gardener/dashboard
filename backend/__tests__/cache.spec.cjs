//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { Store } = require('@gardener-dashboard/kube-client')
const cache = require('../dist/lib/cache')
const fixtures = require('../__fixtures__')
const { cache: internalCache } = cache

describe('cache', function () {
  afterEach(() => {
    internalCache.clear()
  })

  it('should dispatch "synchronize" to internal cache', function () {
    const stub = jest.spyOn(internalCache, 'set')
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
    const stub = jest.spyOn(internalCache, 'getCloudProfiles').mockReturnValue(list)
    expect(cache.getCloudProfiles()).toBe(list)
    expect(stub).toHaveBeenCalledTimes(1)
  })

  it('should dispatch "getQuotas" to internal cache', function () {
    const list = []
    const stub = jest.spyOn(internalCache, 'getQuotas').mockReturnValue(list)
    expect(cache.getQuotas()).toBe(list)
    expect(stub).toHaveBeenCalledTimes(1)
  })

  it('should dispatch "getSeeds" to internal cache', function () {
    const list = []
    const stub = jest.spyOn(internalCache, 'getSeeds').mockReturnValue(list)
    expect(cache.getSeeds()).toBe(list)
    expect(stub).toHaveBeenCalledTimes(1)
  })

  it('should dispatch "getProjects" to internal cache', function () {
    const list = []
    const stub = jest.spyOn(internalCache, 'getProjects').mockReturnValue(list)
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

  it('should dispatch "getShoot" to internal cache', function () {
    const store = new Store()
    store.replace(fixtures.shoots.list())
    internalCache.set('shoots', store)
    expect(cache.getShoot('garden-foo', 'fooShoot')).toBe(store.getByKey(1))
  })

  it('should dispatch "getShootByUid" to internal cache', function () {
    const store = new Store()
    store.replace(fixtures.shoots.list())
    internalCache.set('shoots', store)
    const object = store.getByKey(1)
    expect(cache.getShootByUid(object.metadata.uid)).toBe(object)
  })

  it('should dispatch "getControllerRegistrations" to internal cache', function () {
    const list = []
    const stub = jest.spyOn(internalCache, 'getControllerRegistrations').mockReturnValue(list)
    expect(cache.getControllerRegistrations()).toBe(list)
    expect(stub).toHaveBeenCalledTimes(1)
  })

  it('should dispatch "getResourceQuotas" to internal cache', function () {
    const list = []
    const stub = jest.spyOn(internalCache, 'getResourceQuotas').mockReturnValue(list)
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
  })
})
