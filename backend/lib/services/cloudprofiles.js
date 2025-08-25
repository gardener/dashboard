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

export async function list ({ user }) {
  const allowed = await authorization.canListCloudProfiles(user)
  if (!allowed) {
    throw new Forbidden('You are not allowed to list cloudprofiles')
  }

  return getCloudProfiles()
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

  return cloudProfileResource
}
