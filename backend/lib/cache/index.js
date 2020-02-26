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
const { Store } = require('../kubernetes-client/cache')
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

  synchronize (dashboardClient) {
    if (!this.synchronizationTriggered) {
      dashboardClient['core.gardener.cloud'].cloudprofiles.syncList(this.cloudprofiles)
      dashboardClient['core.gardener.cloud'].quotas.syncListAllNamespaces(this.quotas)
      dashboardClient['core.gardener.cloud'].seeds.syncList(this.seeds)
      dashboardClient['core.gardener.cloud'].projects.syncList(this.projects)
      this.synchronizationTriggered = true
    }
  }

  getCloudProfiles () {
    return this.cloudprofiles.values()
  }

  getQuotas () {
    return this.quotas.values()
  }

  getSeeds () {
    return this.seeds.values()
  }

  getProjects () {
    return this.projects.values()
  }

  getJournalCache () {
    return this.journalCache
  }
}

const cache = new Cache()

module.exports = {
  cache,
  synchronize (dashboardClient) {
    cache.synchronize(dashboardClient)
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
  getJournalCache () {
    return cache.getJournalCache()
  }
}
