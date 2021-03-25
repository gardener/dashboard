//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const cache = require('../lib/cache')
const { cache: internalCache } = cache

describe('cache', function () {
  it('should dispatch "synchronize" to internal cache', function () {
    const stub = jest.spyOn(internalCache, 'set')
    const a = { store: { id: 1 } }
    const b = { store: { id: 2 } }
    cache.initialize({ a, b })
    expect(stub).toBeCalledTimes(2)
    expect(stub.mock.calls).toEqual([
      ['a', { id: 1 }],
      ['b', { id: 2 }]
    ])
  })

  it('should dispatch "getCloudProfiles" to internal cache', function () {
    const list = []
    const stub = jest.spyOn(internalCache, 'getCloudProfiles').mockReturnValue(list)
    expect(cache.getCloudProfiles()).toBe(list)
    expect(stub).toBeCalledTimes(1)
  })

  it('should dispatch "getQuotas" to internal cache', function () {
    const list = []
    const stub = jest.spyOn(internalCache, 'getQuotas').mockReturnValue(list)
    expect(cache.getQuotas()).toBe(list)
    expect(stub).toBeCalledTimes(1)
  })

  it('should dispatch "getSeeds" to internal cache', function () {
    const list = []
    const stub = jest.spyOn(internalCache, 'getSeeds').mockReturnValue(list)
    expect(cache.getSeeds()).toBe(list)
    expect(stub).toBeCalledTimes(1)
  })

  it('should dispatch "getProjects" to internal cache', function () {
    const list = []
    const stub = jest.spyOn(internalCache, 'getProjects').mockReturnValue(list)
    expect(cache.getProjects()).toBe(list)
    expect(stub).toBeCalledTimes(1)
  })

  it('should dispatch "getControllerRegistrations" to internal cache', function () {
    const list = []
    const stub = jest.spyOn(internalCache, 'getControllerRegistrations').mockReturnValue(list)
    expect(cache.getControllerRegistrations()).toEqual(list)
    expect(stub).toBeCalledTimes(1)
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
