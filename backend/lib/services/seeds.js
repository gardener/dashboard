//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const _ = require('lodash')
const { Forbidden } = require('http-errors')
const authorization = require('./authorization')
const { getSeeds } = require('../cache')
const config = require('../config')

function fromResource (seed) {
  const unreachable = isUnreachable(seed)
  const metadata = {
    name: _.get(seed, 'metadata.name'),
    unreachable
  }

  const taints = _.get(seed, 'spec.taints')
  const unprotected = !_.find(taints, ['key', 'seed.gardener.cloud/protected'])
  const visible = !_.find(taints, ['key', 'seed.gardener.cloud/invisible'])
  const provider = _.get(seed, 'spec.provider')
  const volume = _.get(seed, 'spec.volume')
  const data = {
    volume,
    ...provider,
    visible,
    unprotected
  }

  return { metadata, data }
}

function isUnreachable (seed) {
  const matchLabels = _.get(config, 'unreachableSeeds.matchLabels')
  if (!matchLabels) {
    return false
  }
  return _.isMatch(seed, { metadata: { labels: matchLabels } })
}

exports.list = async function ({ user }) {
  const allowed = await authorization.canListSeeds(user)
  if (!allowed) {
    throw new Forbidden('You are not allowed to list seeds')
  }

  const seeds = getSeeds()
  return _.map(seeds, fromResource)
}
