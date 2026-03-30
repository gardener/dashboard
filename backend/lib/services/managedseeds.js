//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import _ from 'lodash-es'
import httpErrors from 'http-errors'
import * as authorization from './authorization.js'
import cache from '../cache/index.js'
import { simplifyManagedSeed } from '../utils/index.js'
const { Forbidden } = httpErrors

export async function list ({ user, namespace }) {
  if (namespace !== 'garden') {
    throw new httpErrors.UnprocessableEntity('Managed seeds are restricted to the garden namespace')
  }

  const allowed = await authorization.canListManagedSeedsInGardenNamespace(user)
  if (!allowed) {
    throw new Forbidden('You are not allowed to list managed seeds in the garden namespace')
  }

  return _
    .chain(cache.getManagedSeedsInGardenNamespace())
    .map(_.cloneDeep)
    .map(simplifyManagedSeed)
    .value()
}
