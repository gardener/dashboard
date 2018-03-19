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

'use strict'

const { NotFound } = require('../errors')
const { map, pick, assign, get, findIndex, find, filter } = require('lodash')
const { getCloudProfiles, getVisibleAndNotProtectedSeeds } = require('../cache')
const { getCloudProviderKind } = require('../utils')

function fromResource ({cloudProfile: {metadata, spec}, seeds}) {
  const cloudProviderKind = getCloudProviderKind(spec)
  const keyStoneURL = get(spec, `${cloudProviderKind}.keystoneURL`)
  const name = get(metadata, 'name')
  const displayName = get(metadata, ['annotations', 'garden.sapcloud.io/displayName'], name)
  metadata = assign(pick(metadata, 'resourceVersion'), {name, cloudProviderKind, displayName})
  const data = assign(get(spec, `${cloudProviderKind}.constraints`), {seeds, keyStoneURL})
  return {metadata, data}
}

function fromSeedResource ({metadata, spec}) {
  metadata = pick(metadata, ['name'])
  const data = get(spec, 'cloud')
  return {metadata, data}
}

async function getSeedsForCloudProfileName ({seeds, cloudProfileName}) {
  const predicate = item => get(item, 'spec.cloud.profile') === cloudProfileName
  const seedsForCloudProfileName = filter(seeds, predicate)

  return Promise.resolve(map(seedsForCloudProfileName, fromSeedResource))
}

exports.list = async function () {
  const seeds = getVisibleAndNotProtectedSeeds()

  const predicate = item => findIndex(seeds, ['spec.cloud.profile', item.metadata.name]) !== -1
  const filteredCloudProfileList = filter(getCloudProfiles(), predicate)

  const cloudProfiles = []
  for (const cloudProfile of filteredCloudProfileList) {
    const seedsForCloudProfile = await getSeedsForCloudProfileName({seeds, cloudProfileName: cloudProfile.metadata.name})
    cloudProfiles.push(fromResource({cloudProfile, seeds: seedsForCloudProfile}))
  }

  return Promise.resolve(cloudProfiles)
}

exports.read = async function ({name}) {
  const seeds = getVisibleAndNotProtectedSeeds()

  const seedWithNameExists = findIndex(seeds, ['spec.cloud.profile', name]) !== -1
  if (!seedWithNameExists) {
    throw new NotFound(`No matching seed for cloud profile with name ${name} found`)
  }

  const cloudProfile = find(getCloudProfiles(), ['metadata.name', name])
  if (!cloudProfile) {
    throw new NotFound(`Cloud profile with name ${name} not found`)
  }
  const seedsForCloudProfile = await getSeedsForCloudProfileName({seeds, cloudProfileName: name})
  return Promise.resolve(fromResource({cloudProfile, seeds: seedsForCloudProfile}))
}
