
//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const _ = require('lodash')
const config = require('../config')
const assert = require('assert').strict

function decodeBase64 (value) {
  if (!value) {
    return
  }
  return Buffer.from(value, 'base64').toString('utf8')
}

function encodeBase64 (value) {
  if (!value) {
    return
  }
  return Buffer.from(value, 'utf8').toString('base64')
}

function getConfigValue (path, defaultValue) {
  const value = _.get(config, path, defaultValue)
  if (arguments.length === 1 && typeof value === 'undefined') {
    assert.fail(`no config with ${path} found`)
  }
  return value
}

function getSeedNameFromShoot ({ spec = {} }) {
  const seed = spec.seedName
  assert.ok(seed, 'There is no seed assigned to this shoot (yet)')
  return seed
}

function shootHasIssue (shoot) {
  return _.get(shoot, ['metadata', 'labels', 'shoot.gardener.cloud/status'], 'healthy') !== 'healthy'
}

function isSeedUnreachable (seed) {
  const matchLabels = _.get(config, 'unreachableSeeds.matchLabels')
  if (!matchLabels) {
    return false
  }
  return _.isMatch(seed, { metadata: { labels: matchLabels } })
}

module.exports = {
  decodeBase64,
  encodeBase64,
  getConfigValue,
  getSeedNameFromShoot,
  shootHasIssue,
  isSeedUnreachable
}
