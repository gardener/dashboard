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

function getSeedsForCloudProfile ({ seeds, cloudProviderKind, matchLabels }) {
  return _
    .chain(seeds)
    .filter(({ metadata, spec }) => {
      if (spec.provider.type !== cloudProviderKind) {
        return false
      }
      for (let [key, value] of Object.entries(matchLabels)) {
        if (value !== _.get(metadata, ['labels', key])) {
          return false
        }
      }
      return true
    })
    .map(fromSeedResource)
    .value()
}

exports.list = function () {
  const seeds = getVisibleAndNotProtectedSeeds()
  const cloudProfiles = getCloudProfiles()

  const profiles = _
    .chain(cloudProfiles)
    .map(cloudProfile => fromResource({
      cloudProfile,
      seeds: getSeedsForCloudProfile({
        seeds,
        cloudProviderKind: cloudProfile.spec.type,
        matchLabels: _.get(cloudProfile, 'spec.seedSelector.matchLabels', {})
      })
    }))
    .filter(cloudProfile => !_.isEmpty(cloudProfile.data.seeds))
    .value()

  const fakeCP = _.cloneDeep(_.find(profiles, { data: { type: 'openstack' } }))
  fakeCP.metadata.name = 'FAKEPROFILE'
  fakeCP.metadata.displayName = 'FAKEPROFILE'
  fakeCP.data.providerConfig.constraints = {
    'floatingPools': [
      {
        'loadBalancerClasses': [
          {
            'floatingSubnetID': 'cc4cf15d-dcd3-43bb-bc31-bfd4b9d6996d',
            'name': 'internal'
          },
          {
            'floatingSubnetID': '1bef59b2-74a5-4f94-aad6-83a59abe2aa0',
            'name': 'internet'
          }
        ],
        'name': 'FloatingIP-external-cp'
      },
      {
        'loadBalancerClasses': [
          {
            'floatingSubnetID': '42f12acd-244d-486e-8bbf-c58b0cb44619',
            'name': 'default'
          }
        ],
        'name': 'FloatingIP-external-cp-gardener'
      }
    ]
  }

  profiles.push(fakeCP)
  console.log(JSON.stringify(fakeCP))

  return profiles
}

exports.read = function ({ name }) {
  const cloudProfile = _.find(getCloudProfiles(), ['metadata.name', name])
  if (!cloudProfile) {
    throw new NotFound(`Cloud profile with name ${name} not found`)
  }

  const seeds = getVisibleAndNotProtectedSeeds()
  const seedsForCloudProfile = getSeedsForCloudProfile({
    seeds,
    cloudProviderKind: cloudProfile.spec.type,
    matchLabels: _.get(cloudProfile, 'spec.seedSelector.matchLabels', {})
  })

  if (_.isEmpty(seedsForCloudProfile)) {
    throw new NotFound(`No matching seed for cloud profile with name ${name} found`)
  }

  return fromResource({
    cloudProfile,
    seeds: seedsForCloudProfile
  })
}
