//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const _ = require('lodash')
const { Forbidden } = require('http-errors')
const authorization = require('./authorization')
const { getSeeds } = require('../cache')
const { isSeedUnreachable } = require('../utils')

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

exports.list = async function ({ user }) {
  const allowed = await authorization.canListSeeds(user)
  if (!allowed) {
    throw new Forbidden('You are not allowed to list seeds')
  }

  const seeds = getSeeds()
  return _.map(seeds, fromResource)
}
