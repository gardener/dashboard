//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import httpErrors from 'http-errors'
import * as authorization from './authorization.js'
import cache from '../cache/index.js'
import { simplifyCloudProfile } from '../utils/index.js'
const { Forbidden, NotFound } = httpErrors
const { getCloudProfiles, getCloudProfile } = cache

export async function list ({ user }) {
  const allowed = await authorization.canListCloudProfiles(user)
  if (!allowed) {
    throw new Forbidden('You are not allowed to list cloudprofiles')
  }
  const allItems = getCloudProfiles()

  return allItems
    .map(simplifyCloudProfile)
}

export async function read ({ user, name }) {
  const allowed = await authorization.canGetCloudProfiles(user, name)
  if (!allowed) {
    throw new Forbidden(`You are not allowed to get cloudprofile ${name}`)
  }
  const cloudProfile = getCloudProfile(name)
  if (!cloudProfile) {
    throw new NotFound(`CloudProfile '${name}' not found`)
  }
  return simplifyCloudProfile(cloudProfile)
}
