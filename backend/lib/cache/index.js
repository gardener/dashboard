//
// Copyright (c) 2018 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file
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
const domains = []
const quotas = []
const journals = require('./journals')()

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
  getDomains () {
    return domains
  },
  getJournalCache () {
    return journals
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
  getVisibleAndNotProtectedSeeds () {
    const predicate = item => {
      const seedProtected = _.get(item, 'spec.protected', true)
      const seedVisible = _.get(item, 'spec.visible', false)
      return !seedProtected && seedVisible
    }
    return _.filter(cache.getSeeds(), predicate)
  },
  getDomains () {
    return cache.getDomains()
  },
  getJournalCache () {
    return cache.getJournalCache()
  }
}
