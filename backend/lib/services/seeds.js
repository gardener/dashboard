//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import _ from 'lodash-es'
import httpErrors from 'http-errors'
import * as authorization from './authorization.js'
import cache from '../cache/index.js'
import { simplifySeed } from '../utils/index.js'
const { Forbidden } = httpErrors
const { getSeeds } = cache

export async function list ({ user }) {
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
