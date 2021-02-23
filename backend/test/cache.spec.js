//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { orderBy } = require('lodash')
const cache = require('../lib/cache')
const { cache: internalCache } = cache

describe('cache', function () {
  const a = { metadata: { uid: 1, name: 'a', namespace: 'z' } }
  const b = { metadata: { uid: 2, name: 'b', namespace: 'y' } }
  const c = { metadata: { uid: 3, name: 'c', namespace: 'y' } }
  const d = { metadata: { uid: 4, name: 'd', namespace: 'x' } }

  const list = [a, b, c, d]

  function replace (store, items) {
    return new Promise(resolve => {
      process.nextTick(() => {
        store.replace(items)
        resolve()
      })
    })
  }

  class CloudProfile {
    syncList (store) {
      return replace(store, [a, c])
    }
  }
  CloudProfile.scope = 'Cluster'

  class Quota {
    syncListAllNamespaces (store) {
      return replace(store, [a, b, c])
    }
  }
  Quota.scope = 'Namespaced'

  class Seed {
    syncList (store) {
      return replace(store, [a, b])
    }
  }
  Seed.scope = 'Cluster'

  class Project {
    syncList (store) {
      return replace(store, [a, b, c, d])
    }
  }
  Project.scope = 'Cluster'

  class ControllerRegistration {
    syncList (store) {
      return replace(store, [a, c])
    }
  }
  ControllerRegistration.scope = 'Cluster'

  const gardenerCore = {
    cloudprofiles: new CloudProfile(),
    quotas: new Quota(),
    seeds: new Seed(),
    projects: new Project(),
    controllerregistrations: new ControllerRegistration()
  }

  const testClient = {
    'core.gardener.cloud': gardenerCore
  }

  it('should dispatch "synchronize" to internal cache', function () {
    const stub = jest.spyOn(internalCache, 'synchronize')
    cache.synchronize(testClient)
    expect(stub).toBeCalledTimes(1)
    expect(stub.mock.calls[0][0]).toBe(testClient)
  })

  it('should dispatch "getCloudProfiles" to internal cache', function () {
    const stub = jest.spyOn(internalCache, 'getCloudProfiles').mockReturnValue(list)
    expect(cache.getCloudProfiles()).toBe(list)
    expect(stub).toBeCalledTimes(1)
  })

  it('should dispatch "getQuotas" to internal cache', function () {
    const stub = jest.spyOn(internalCache, 'getQuotas').mockReturnValue(list)
    expect(cache.getQuotas()).toBe(list)
    expect(stub).toBeCalledTimes(1)
  })

  it('should dispatch "getSeeds" to internal cache', function () {
    const stub = jest.spyOn(internalCache, 'getSeeds').mockReturnValue(list)
    expect(cache.getSeeds()).toBe(list)
    expect(stub).toBeCalledTimes(1)
  })

  it('should dispatch "getProjects" to internal cache', function () {
    const stub = jest.spyOn(internalCache, 'getProjects').mockReturnValue(list)
    expect(cache.getProjects()).toBe(list)
    expect(stub).toBeCalledTimes(1)
  })

  it('should dispatch "getControllerRegistrations" to internal cache', function () {
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

    describe('#synchronize', function () {
      let syncCloudprofilesSpy
      let syncQuotasSpy
      let syncSeedsSpy
      let syncProjectsSpy
      let syncControllerregistrationsSpy

      beforeEach(function () {
        syncCloudprofilesSpy = jest.spyOn(gardenerCore.cloudprofiles, 'syncList')
        syncQuotasSpy = jest.spyOn(gardenerCore.quotas, 'syncListAllNamespaces')
        syncSeedsSpy = jest.spyOn(gardenerCore.seeds, 'syncList')
        syncProjectsSpy = jest.spyOn(gardenerCore.projects, 'syncList')
        syncControllerregistrationsSpy = jest.spyOn(gardenerCore.controllerregistrations, 'syncList')
      })

      it('should syncronize the cache', async function () {
        expect(cache.synchronizationPromise).toBeInstanceOf(Promise)
        expect(cache.synchronizationPromiseResolved).toBe(false)
        await cache.synchronize(testClient)
        expect(cache.synchronizationPromiseResolved).toBe(true)
        expect(syncCloudprofilesSpy).toBeCalledTimes(1)
        expect(syncQuotasSpy).toBeCalledTimes(1)
        expect(syncSeedsSpy).toBeCalledTimes(1)
        expect(syncProjectsSpy).toBeCalledTimes(1)
        expect(syncControllerregistrationsSpy).toBeCalledTimes(1)
        expect(cache.synchronizationPromise).toBeInstanceOf(Promise)
        expect(orderBy(cache.getCloudProfiles(), 'metadata.uid')).toEqual([a, c])
        expect(orderBy(cache.getQuotas(), 'metadata.uid')).toEqual([a, b, c])
        expect(orderBy(cache.getSeeds(), 'metadata.uid')).toEqual([a, b])
        expect(orderBy(cache.getProjects(), 'metadata.uid')).toEqual([a, b, c, d])
        expect(orderBy(cache.getControllerRegistrations(), 'metadata.uid')).toEqual([a, c])
      })
    })

    describe('#getTicketCache', function () {
      it('should return the ticket cache', function () {
        expect(cache.getTicketCache()).toBe(cache.ticketCache)
      })
    })
  })
})
