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

const cloudProfiles = []
const seeds = []
const quotas = []
const journals = require('./journals')()
const projects = {}

const cache = {
  getCloudProfiles () {
    return cloudProfiles
  },
  getQuotas () {
    return quotas
  },
  getSeeds () {
    return seeds
  },
  getJournalCache () {
    return journals
  },
  getProjectsCache () {
    return projects
  }
}

module.exports = {
  _cache: cache,
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
    return _.cloneDeep(_.find(cache.getSeeds(), ['metadata.name', name]))
  },
  getVisibleAndNotProtectedSeeds () {
    const predicate = item => {
      const taints = _.get(item, 'spec.taints', [])
      let seedProtected = false
      let seedInVisible = false
      _.forEach(taints, taint => {
        if (taint.key === 'seed.gardener.cloud/protected') {
          seedProtected = true
        }
        if (taint.key === 'seed.gardener.cloud/invisible') {
          seedInVisible = true
        }
      })
      return !seedProtected && !seedInVisible
    }
    return _.filter(cache.getSeeds(), predicate)
  },
  getJournalCache () {
    return cache.getJournalCache()
  },
  getProjectsCache () {
    return cache.getProjectsCache()
  },
  getProjectsList () {
    const projectsCache = cache.getProjectsCache()
    return _.values(projectsCache)
  }
}
