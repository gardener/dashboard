//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { NotFound, Forbidden } = require('http-errors')
const authorization = require('./authorization')
const logger = require('../logger')
const _ = require('lodash')
const { getCloudProfiles, getVisibleAndNotProtectedSeeds } = require('../cache')

function fromResource ({ cloudProfile: { metadata, spec }, seedNames }) {
  const cloudProviderKind = spec.type
  const name = _.get(metadata, 'name')
  const displayName = _.get(metadata, ['annotations', 'garden.sapcloud.io/displayName'], name)
  const resourceVersion = _.get(metadata, 'resourceVersion')
  metadata = { name, cloudProviderKind, displayName, resourceVersion }
  const data = { seedNames, ...spec }
  return { metadata, data }
}

function emptyToUndefined (value) {
  return _.isEmpty(value) ? undefined : value
}

function assignSeedsToCloudProfileIteratee (seeds) {
  return cloudProfileResource => {
    function filterProviderType (seed) {
      const seedProviderType = _.get(seed, 'spec.provider.type')
      return _.includes(providerTypes, seedProviderType)
    }
    const providerType = cloudProfileResource.spec.type
    const matchLabels = _.get(cloudProfileResource, 'spec.seedSelector.matchLabels', {})
    const providerTypes = _.get(cloudProfileResource, 'spec.seedSelector.providerTypes', [providerType])

    const seedNamesForCloudProfile = _
      .chain(seeds)
      .filter(filterProviderType)
      .filter({ metadata: { labels: matchLabels } })
      .map('metadata.name')
      .thru(emptyToUndefined)
      .value()

    return fromResource({
      cloudProfile: cloudProfileResource,
      seedNames: seedNamesForCloudProfile
    })
  }
}

exports.list = async function ({ user }) {
  const allowed = await authorization.canListCloudProfiles(user)
  if (!allowed) {
    throw new Forbidden('You are not allowed to list cloudprofiles')
  }

  const cloudProfiles = getCloudProfiles()
  const seeds = getVisibleAndNotProtectedSeeds()
  return _
    .chain(cloudProfiles)
    .map(assignSeedsToCloudProfileIteratee(seeds))
    .filter(cloudProfile => {
      if (!_.isEmpty(cloudProfile.data.seedNames)) {
        return true
      }
      logger.warn(`No matching seed for cloud profile with name ${cloudProfile.metadata.name} found`)
      return false
    })
    .value()
}

exports.read = async function ({ user, name }) {
  const allowed = await authorization.canGetCloudProfiles(user, name)
  if (!allowed) {
    throw new Forbidden(`You are not allowed to get cloudprofile ${name}`)
  }

  const cloudProfiles = getCloudProfiles()
  const cloudProfileResource = _.find(cloudProfiles, ['metadata.name', name])
  if (!cloudProfileResource) {
    throw new NotFound(`Cloud profile with name ${name} not found`)
  }

  const seeds = getVisibleAndNotProtectedSeeds()
  const cloudProfile = assignSeedsToCloudProfileIteratee(seeds)(cloudProfileResource)
  if (!cloudProfile.data.seedNames) {
    throw new NotFound(`No matching seed for cloud profile with name ${name} found`)
  }

  return cloudProfile
}
