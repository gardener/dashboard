//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import httpErrors from 'http-errors'
import * as authorization from './authorization.js'
import cache from '../cache/index.js'
const { Forbidden } = httpErrors
const { getCloudProfiles, getNamespacedCloudProfiles } = cache

export async function list ({ user }) {
  const allowed = await authorization.canListCloudProfiles(user)
  if (!allowed) {
    throw new Forbidden('You are not allowed to list cloudprofiles')
  }

  return getCloudProfiles()
}

export async function listForNamespace ({ user, namespace }) {
  const allowed = await authorization.canListNamespacedCloudProfiles(user, namespace)
  if (!allowed) {
    throw new Forbidden(`You are not allowed to list namespaced cloudprofiles in namespace ${namespace}`)
  }

  return getNamespacedCloudProfiles(namespace)
}
