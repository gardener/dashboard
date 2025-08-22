//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import httpErrors from 'http-errors'
import * as authorization from './authorization.js'
import _ from 'lodash-es'
import cache from '../cache/index.js'
const { NotFound, Forbidden } = httpErrors
const { getCloudProfiles } = cache

function fromResource ({ metadata, spec }) {
  const providerType = spec.type
  const name = _.get(metadata, ['name'])
  const displayName = _.get(metadata, ['annotations', 'garden.sapcloud.io/displayName'], name)
  const resourceVersion = _.get(metadata, ['resourceVersion'])
  metadata = { name, providerType, displayName, resourceVersion }
  const data = { ...spec }
  return { metadata, data }
}

export async function list ({ user }) {
  const allowed = await authorization.canListCloudProfiles(user)
  if (!allowed) {
    throw new Forbidden('You are not allowed to list cloudprofiles')
  }

  const cloudProfiles = getCloudProfiles()
  return _.map(cloudProfiles, fromResource)
}

export async function read ({ user, name }) {
  const allowed = await authorization.canGetCloudProfiles(user, name)
  if (!allowed) {
    throw new Forbidden(`You are not allowed to get cloudprofile ${name}`)
  }

  const cloudProfiles = getCloudProfiles()
  const cloudProfileResource = _.find(cloudProfiles, ['metadata.name', name])
  if (!cloudProfileResource) {
    throw new NotFound(`Cloud profile with name ${name} not found`)
  }

  return fromResource(cloudProfileResource)
}
