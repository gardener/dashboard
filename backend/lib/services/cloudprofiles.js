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

const { NotFound } = require('../errors')
const _ = require('lodash')
const { getCloudProfiles, getVisibleAndNotProtectedSeeds } = require('../cache')

function fromResource ({ cloudProfile: { metadata, spec }, seeds }) {
  const cloudProviderKind = spec.type
  const name = _.get(metadata, 'name')
  const displayName = _.get(metadata, ['annotations', 'garden.sapcloud.io/displayName'], name)
  const resourceVersion = _.get(metadata, 'resourceVersion')
  metadata = { name, cloudProviderKind, displayName, resourceVersion }
  const data = { seeds, ...spec }
  return { metadata, data }
}

function fromSeedResource ({ metadata, spec }) {
  metadata = _.pick(metadata, ['name'])
  const provider = _.get(spec, 'provider')
  const volume = _.get(spec, 'volume')
  const data = { volume, ...provider }
  return { metadata, data }
}

function emptyToUndefined (value) {
  return _.isEmpty(value) ? undefined : value
}

function assignSeedsToCloudProfileIteratee (seeds) {
  return cloudProfileResource => {
    const providerType = cloudProfileResource.spec.type
    const matchLabels = _.get(cloudProfileResource, 'spec.seedSelector.matchLabels', {})

    const seedsForCloudProfile = _
      .chain(seeds)
      .filter(['spec.provider.type', providerType])
      .filter({ metadata: { labels: matchLabels } })
      .map(fromSeedResource)
      .thru(emptyToUndefined)
      .value()

    return fromResource({
      cloudProfile: cloudProfileResource,
      seeds: seedsForCloudProfile
    })
  }
}

exports.list = function () {
  const cloudProfiles = getCloudProfiles()
  const seeds = getVisibleAndNotProtectedSeeds()
  return _
    .chain(cloudProfiles)
    .map(assignSeedsToCloudProfileIteratee(seeds))
    .filter('data.seeds')
    .value()
}

exports.read = function ({ name }) {
  const cloudProfiles = getCloudProfiles()
  const cloudProfileResource = _.find(cloudProfiles, ['metadata.name', name])
  if (!cloudProfileResource) {
    throw new NotFound(`Cloud profile with name ${name} not found`)
  }

  const seeds = getVisibleAndNotProtectedSeeds()
  const cloudProfile = assignSeedsToCloudProfileIteratee(seeds)(cloudProfileResource)
  if (!cloudProfile.data.seeds) {
    throw new NotFound(`No matching seed for cloud profile with name ${name} found`)
  }

  return cloudProfile
}
