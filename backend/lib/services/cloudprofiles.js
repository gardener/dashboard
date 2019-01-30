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
const { getCloudProviderKind } = require('../utils')

function fromResource ({ cloudProfile: { metadata, spec }, seeds }) {
  const cloudProviderKind = getCloudProviderKind(spec)
  const keyStoneURL = _.get(spec, `${cloudProviderKind}.keystoneURL`)
  const name = _.get(metadata, 'name')
  const displayName = _.get(metadata, ['annotations', 'garden.sapcloud.io/displayName'], name)
  const resourceVersion = _.get(metadata, 'resourceVersion')
  metadata = { name, cloudProviderKind, displayName, resourceVersion }
  const constraints = _.get(spec, `${cloudProviderKind}.constraints`)
  const data = { seeds, keyStoneURL, ...constraints }
  return { metadata, data }
}

function fromSeedResource ({ metadata, spec }) {
  metadata = _.pick(metadata, ['name'])
  const data = _.get(spec, 'cloud')
  return { metadata, data }
}

function getSeedsForCloudProfileName ({ seeds, cloudProfileName }) {
  return _
    .chain(seeds)
    .filter(['spec.cloud.profile', cloudProfileName])
    .map(fromSeedResource)
    .value()
}

exports.list = function () {
  const seeds = getVisibleAndNotProtectedSeeds()

  const predicate = item => _.findIndex(seeds, ['spec.cloud.profile', item.metadata.name]) !== -1
  return _
    .chain(getCloudProfiles())
    .filter(predicate)
    .map(cloudProfile => fromResource({
      cloudProfile,
      seeds: getSeedsForCloudProfileName({
        seeds,
        cloudProfileName: cloudProfile.metadata.name
      })
    }))
    .value()
}

exports.read = function ({ name }) {
  const seeds = getVisibleAndNotProtectedSeeds()

  const seedWithNameExists = _.findIndex(seeds, ['spec.cloud.profile', name]) !== -1
  if (!seedWithNameExists) {
    throw new NotFound(`No matching seed for cloud profile with name ${name} found`)
  }

  const cloudProfile = _.find(getCloudProfiles(), ['metadata.name', name])
  if (!cloudProfile) {
    throw new NotFound(`Cloud profile with name ${name} not found`)
  }
  return fromResource({
    cloudProfile,
    seeds: getSeedsForCloudProfileName({
      seeds,
      cloudProfileName: name
    })
  })
}
