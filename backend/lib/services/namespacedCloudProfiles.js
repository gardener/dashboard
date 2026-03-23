//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import _ from 'lodash-es'
import httpErrors from 'http-errors'
import * as jsondiffpatch from 'jsondiffpatch'
import * as authorization from './authorization.js'
import cache from '../cache/index.js'
import { simplifyCloudProfile } from '../utils/index.js'
const { Forbidden } = httpErrors
const { getNamespacedCloudProfiles, getCloudProfile } = cache

/**
 * Computes the diff between the parent CloudProfile spec and the NamespacedCloudProfile status.cloudProfileSpec.
 * Both specs are simplified using simplifyCloudProfile before comparison, which filters providerConfig
 * according to the cloud provider type (keeping relevant fields for ironcore/openstack, removing for others).
 *
 * @param {Object} namespacedCloudProfile - The namespaced cloud profile (already simplified)
 * @returns {Object} The diff delta
 */
function computeDiff (namespacedCloudProfile) {
  const parentName = _.get(namespacedCloudProfile, ['spec', 'parent', 'name'])
  const parentCloudProfile = getCloudProfile(parentName)

  if (!parentCloudProfile) {
    return null
  }

  // parentCloudProfile is already cloned by cache.getCloudProfile(name)
  const simplifiedParent = simplifyCloudProfile(parentCloudProfile)

  const parentSpec = _.get(simplifiedParent, ['spec'], {})
  const namespacedSpec = _.get(namespacedCloudProfile, ['status', 'cloudProfileSpec'], {})

  return jsondiffpatch.diff(parentSpec, namespacedSpec)
}

/**
 * Transforms a namespaced cloud profile to include only the diff instead of the full status.
 * The diff represents the changes from the parent CloudProfile spec to the NamespacedCloudProfile status.cloudProfileSpec.
 *
 * @param {Object} profile - The namespaced cloud profile (already simplified)
 * @returns {Object} The profile with diff instead of full cloudProfileSpec
 */
function transformToDiff (profile) {
  const diff = computeDiff(profile)

  const result = _.cloneDeep(profile)
  result.status = {
    ...result.status,
    cloudProfileSpecDiff: diff || null,
  }
  delete result.status.cloudProfileSpec

  return result
}

export async function listForNamespace ({ user, namespace, diff = false }) {
  const allowed = await authorization.canListNamespacedCloudProfiles(user, namespace)
  if (!allowed) {
    throw new Forbidden(`You are not allowed to list namespaced cloudprofiles in namespace ${namespace}`)
  }

  const items = getNamespacedCloudProfiles(namespace)
  const simplifiedItems = items.map(simplifyCloudProfile)

  if (diff) {
    return simplifiedItems.map(simplified => transformToDiff(simplified))
  }

  return simplifiedItems
}
