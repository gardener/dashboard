//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import _ from 'lodash-es'
import httpErrors from 'http-errors'
import * as authorization from './authorization.js'
import cache from '../cache/index.js'
import { isSeedUnreachable } from '../utils/index.js'
const { Forbidden } = httpErrors
const { getSeeds } = cache

function fromResource (seed) {
  const unreachable = isSeedUnreachable(seed)
  const metadata = {
    name: _.get(seed, ['metadata', 'name']),
    unreachable,
  }

  const taints = _.get(seed, ['spec', 'taints'])
  const unprotected = !_.find(taints, ['key', 'seed.gardener.cloud/protected'])
  const visible = _.get(seed, ['spec', 'settings', 'scheduling', 'visible'])
  const provider = _.get(seed, ['spec', 'provider'])
  const volume = _.get(seed, ['spec', 'volume'])
  const ingressDomain = _.get(seed, ['spec', 'ingress', 'domain'])
  const data = {
    volume,
    ...provider,
    visible,
    unprotected,
    ingressDomain,
  }

  return { metadata, data }
}

export async function list ({ user }) {
  const allowed = await authorization.canListSeeds(user)
  if (!allowed) {
    throw new Forbidden('You are not allowed to list seeds')
  }

  const seeds = getSeeds()
  return _.map(seeds, fromResource)
}
