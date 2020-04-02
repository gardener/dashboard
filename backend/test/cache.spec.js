//
// Copyright (c) 2019 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

'use strict'

const { orderBy } = require('lodash')
const cache = require('../lib/cache')
const { cache: internalCache } = cache

describe('cache', function () {
  /* eslint no-unused-expressions: 0 */
  const sandbox = sinon.createSandbox()

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

  const gardenerCore = {
    cloudprofiles: new CloudProfile(),
    quotas: new Quota(),
    seeds: new Seed(),
    projects: new Project()
  }

  const testClient = {
    'core.gardener.cloud': gardenerCore
  }

  afterEach(function () {
    sandbox.restore()
  })

  it('should dispatch "synchronize" to internal cache', function () {
    const stub = sandbox.stub(internalCache, 'synchronize')
    cache.synchronize(testClient)
    expect(stub).to.be.calledOnceWith(testClient)
  })

  it('should dispatch "getCloudProfiles" to internal cache', function () {
    const stub = sandbox.stub(internalCache, 'getCloudProfiles').returns(list)
    expect(cache.getCloudProfiles()).to.equal(list)
    expect(stub).to.be.calledOnce
  })

  it('should dispatch "getQuotas" to internal cache', function () {
    const stub = sandbox.stub(internalCache, 'getQuotas').returns(list)
    expect(cache.getQuotas()).to.equal(list)
    expect(stub).to.be.calledOnce
  })

  it('should dispatch "getSeeds" to internal cache', function () {
    const stub = sandbox.stub(internalCache, 'getSeeds').returns(list)
    expect(cache.getSeeds()).to.equal(list)
    expect(stub).to.be.calledOnce
  })

  it('should dispatch "getProjects" to internal cache', function () {
    const stub = sandbox.stub(internalCache, 'getProjects').returns(list)
    expect(cache.getProjects()).to.equal(list)
    expect(stub).to.be.calledOnce
  })

  describe('Cache', function () {
    const Cache = internalCache.constructor
    let cache

    beforeEach(function () {
      cache = new Cache()
    })

    describe('#synchronize', async function () {
      let syncCloudprofilesSpy
      let syncQuotasSpy
      let syncSeedsSpy
      let syncProjectsSpy

      beforeEach(function () {
        syncCloudprofilesSpy = sandbox.spy(gardenerCore.cloudprofiles, 'syncList')
        syncQuotasSpy = sandbox.spy(gardenerCore.quotas, 'syncListAllNamespaces')
        syncSeedsSpy = sandbox.spy(gardenerCore.seeds, 'syncList')
        syncProjectsSpy = sandbox.spy(gardenerCore.projects, 'syncList')
      })

      it('should syncronize the cache', async function () {
        expect(cache.synchronizationPromise).to.be.undefined
        await cache.synchronize(testClient)
        expect(syncCloudprofilesSpy).to.be.calledOnce
        expect(syncQuotasSpy).to.be.calledOnce
        expect(syncSeedsSpy).to.be.calledOnce
        expect(syncProjectsSpy).to.be.calledOnce
        expect(cache.synchronizationPromise).to.be.instanceof(Promise)
        expect(orderBy(cache.getCloudProfiles(), 'metadata.uid')).to.eql([a, c])
        expect(orderBy(cache.getQuotas(), 'metadata.uid')).to.eql([a, b, c])
        expect(orderBy(cache.getSeeds(), 'metadata.uid')).to.eql([a, b])
        expect(orderBy(cache.getProjects(), 'metadata.uid')).to.eql([a, b, c, d])
      })
    })

    describe('#getJournalCache', function () {
      it('should return the journal cache', function () {
        expect(cache.getJournalCache()).to.equal(cache.journalCache)
      })
    })
  })
})
