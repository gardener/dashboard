//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import _ from 'lodash-es'
import httpErrors from 'http-errors'
import * as authorization from './authorization.js'
import cache from '../cache/index.js'
import { simplifyManagedSeedShoot } from '../utils/index.js'
const { Forbidden } = httpErrors

export async function list ({ user, namespace }) {
  if (namespace !== 'garden') {
    throw new httpErrors.UnprocessableEntity('Managed seed shoots are restricted to the garden namespace')
  }

  const [canListManagedSeedsInGardenNamespace, canListShootsInGardenNamespace] = await Promise.all([
    authorization.canListManagedSeedsInGardenNamespace(user),
    authorization.canListShootsInGardenNamespace(user),
  ])
  if (!canListManagedSeedsInGardenNamespace || !canListShootsInGardenNamespace) {
    throw new Forbidden('You are not allowed to list managed seed shoots in the garden namespace')
  }

  return _
    .chain(cache.getManagedSeedsInGardenNamespace())
    .map(managedSeed => _.get(managedSeed, ['spec', 'shoot', 'name']))
    .compact()
    .map(shootName => cache.getShoot('garden', shootName))
    .compact()
    .map(_.cloneDeep)
    .map(simplifyManagedSeedShoot)
    .value()
}
