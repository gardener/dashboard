//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import _ from 'lodash-es'
import httpErrors from 'http-errors'
import * as authorization from './authorization.js'
import getCache from '../cache/index.js'
import { simplifySeed } from '../utils/index.js'
const { Forbidden } = httpErrors

export async function list ({ user }) {
  const { getSeeds } = getCache(user.workspace)
  const allowed = await authorization.canListSeeds(user)
  if (!allowed) {
    throw new Forbidden('You are not allowed to list seeds')
  }

  return _
    .chain(getSeeds())
    .map(_.cloneDeep)
    .map(simplifySeed)
    .value()
}
