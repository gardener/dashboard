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

const _ = require('lodash')
const { HTTPError } = require('got')
const pEvent = require('p-event')
const { Store } = require('../kubernetes-client/cache')
const { CacheExpiredError } = require('../kubernetes-client/ApiErrors')
const createJournalCache = require('./journals')

class Cache {
  constructor () {
    this.synchronizationTriggered = false
    this.cloudprofiles = new Store()
    this.seeds = new Store()
    this.quotas = new Store()
    this.projects = new Store()
    this.journalCache = createJournalCache()
  }

  /*
    In file `lib/api.js` the synchronization is started with the privileged dashboardClient.
    Be careful when reading information from the cache that an authorization check is done
    or the information can be considered as not sensitive or public.
  */
  synchronize (client) {
    if (!this.synchronizationTriggered) {
      this.synchronizationTriggered = true
      return Promise.all(_
        .chain(['cloudprofiles', 'quotas', 'seeds', 'projects'])
        .map(async key => {
          const store = this[key]
          const cachable = client['core.gardener.cloud'][key]
          const scope = cachable.constructor.scope
          // eslint-disable-next-line no-unused-vars
          const reflector = scope === 'Cluster'
            ? cachable.syncList(store)
            : cachable.syncListAllNamespaces(store)
          return pEvent(store, 'replaced', {
            rejectionEvents: ['stale']
          })
        })
        .value())
    }
  }

  list (key) {
    if (!this[key].isSynchronized) {
      throw new CacheExpiredError(`The "${key}" service is currently not available. Please try again later.`)
    }
    return this[key].list()
  }

  getCloudProfiles () {
    return this.list('cloudprofiles')
  }

  getQuotas () {
    return this.list('quotas')
  }

  getSeeds () {
    return this.list('seeds')
  }

  getProjects () {
    return this.list('projects')
  }

  getJournalCache () {
    return this.journalCache
  }
}

const cache = new Cache()

module.exports = {
  cache,
  synchronize (client) {
    cache.synchronize(client)
  },
  getCloudProfiles () {
    return cache.getCloudProfiles()
  },
  getQuotas () {
    return cache.getQuotas()
  },
  getSeeds () {
    return cache.getSeeds()
  },
  getSeed (name) {
    return _
      .chain(cache.getSeeds())
      .find(['metadata.name', name])
      .cloneDeep()
      .value()
  },
  getVisibleAndNotProtectedSeeds () {
    const predicate = item => {
      const taints = _.get(item, 'spec.taints')
      const unprotected = !_.find(taints, ['key', 'seed.gardener.cloud/protected'])
      const visible = !_.find(taints, ['key', 'seed.gardener.cloud/invisible'])
      return unprotected && visible
    }
    return _.filter(cache.getSeeds(), predicate)
  },
  getProjects () {
    return cache.getProjects()
  },
  findProjectByNamespace (namespace) {
    const project = _.find(cache.getProjects(), ['spec.namespace', namespace])
    if (!project) {
      throw new HTTPError({
        statusCode: 404,
        statusMessage: `Namespace '${namespace}' is not related to a gardener project`
      })
    }
    return project
  },
  getJournalCache () {
    return cache.getJournalCache()
  }
}
