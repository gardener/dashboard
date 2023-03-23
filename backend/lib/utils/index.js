
//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
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

function projectFilter (user, isAdmin = false) {
  const isMemberOf = project => {
    return _
      .chain(project)
      .get('spec.members')
      .find(({ kind, namespace, name }) => {
        switch (kind) {
          case 'Group':
            if (_.includes(user.groups, name)) {
              return true
            }
            break
          case 'User':
            if (user.id === name) {
              return true
            }
            break
          case 'ServiceAccount':
            if (user.id === `system:serviceaccount:${namespace}:${name}`) {
              return true
            }
            break
        }
        return false
      })
      .value()
  }

  const isPending = project => {
    return _.get(project, 'status.phase', 'Pending') === 'Pending'
  }

  return project => {
    if (isPending(project)) {
      return false
    }
    return isAdmin || isMemberOf(project)
  }
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

function getSeedIngressDomain (seed) {
  return _.get(seed, 'spec.dns.ingressDomain') || _.get(seed, 'spec.ingress.domain')
}

function isSeedUnreachable (seed) {
  const matchLabels = _.get(config, 'unreachableSeeds.matchLabels')
  if (!matchLabels) {
    return false
  }
  return _.isMatch(seed, { metadata: { labels: matchLabels } })
}

function isDateValid (dateOrDateString) {
  const date = dateOrDateString instanceof Date ? dateOrDateString : new Date(dateOrDateString)
  return !isNaN(date.getTime())
}

module.exports = {
  decodeBase64,
  encodeBase64,
  projectFilter,
  getConfigValue,
  getSeedNameFromShoot,
  shootHasIssue,
  isSeedUnreachable,
  getSeedIngressDomain,
  isDateValid
}
