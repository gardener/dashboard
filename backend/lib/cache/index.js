//
// Copyright (c) 2020 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file
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
const { HTTPError } = require('../http-client')
const pEvent = require('p-event')
const logger = require('../logger')
const { Store } = require('../kubernetes-client/cache')
const { CacheExpiredError } = require('../kubernetes-client/ApiErrors')
const createTicketCache = require('./tickets')

async function initializeStoreSynchronization (store, cachable) {
  const { scope, name } = cachable.constructor
  try {
    if (scope === 'Namespaced') {
      cachable.syncListAllNamespaces(store)
    } else {
      cachable.syncList(store)
    }
    await pEvent(store, 'fresh')
  } catch (err) {
    logger.warn('Initialization of %s store synchronization failed', name)
  }
}

class Cache {
  constructor () {
    this.synchronizationPromise = undefined
    this.cloudprofiles = new Store()
    this.seeds = new Store()
    this.quotas = new Store()
    this.projects = new Store()
    this.ticketCache = createTicketCache()
  }

  /*
    In file `lib/api.js` the synchronization is started with the privileged dashboardClient.
    Be careful when reading information from the cache that an authorization check is done
    or the information can be considered as not sensitive or public.
  */
  synchronize (client) {
    if (!this.synchronizationPromise) {
      const keys = ['cloudprofiles', 'quotas', 'seeds', 'projects']
      const iteratee = key => initializeStoreSynchronization(this[key], client['core.gardener.cloud'][key])
      this.synchronizationPromise = Promise.all(keys.map(iteratee))
    }
    return this.synchronizationPromise
  }

  list (key) {
    if (!this[key].isFresh) {
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

  getTicketCache () {
    return this.ticketCache
  }
}

const cache = new Cache()

module.exports = {
  cache,
  synchronize (client) {
    return cache.synchronize(client)
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
    const project = cache.projects.find(['spec.namespace', namespace])
    if (!project) {
      throw new HTTPError({
        statusCode: 404,
        statusMessage: `Namespace '${namespace}' is not related to a gardener project`
      })
    }
    return project
  },
  getTicketCache () {
    return cache.getTicketCache()
  }
}
