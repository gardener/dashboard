//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const _ = require('lodash')
const config = require('../config')
const assert = require('assert').strict

const EXISTS = '∃'
const NOT_EXISTS = '!∃'
const EQUAL = '='
const NOT_EQUAL = '!='

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

function isMemberOf (project, user) {
  return _
    .chain(project)
    .get(['spec', 'members'])
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

function projectFilter (user, canListProjects = false) {
  const isPending = project => {
    return _.get(project, ['status', 'phase'], 'Pending') === 'Pending'
  }

  return project => {
    if (isPending(project)) {
      return false
    }
    return canListProjects || isMemberOf(project, user)
  }
}

function parseRooms (rooms) {
  let isAdmin = false
  const namespaces = []
  const qualifiedNames = []
  for (const room of rooms) {
    const parts = room.split(';')
    const keys = parts[0].split(':')
    if (keys.shift() !== 'shoots') {
      continue
    }
    if (keys.pop() === 'admin') {
      isAdmin = true
    }
    if (parts.length < 2) {
      continue
    }
    const [namespace, name] = parts[1].split('/')
    if (!name) {
      namespaces.push(namespace)
    } else {
      qualifiedNames.push([namespace, name].join('/'))
    }
  }
  return [
    isAdmin,
    namespaces,
    qualifiedNames,
  ]
}

function simplifyObjectMetadata (object) {
  object.metadata.managedFields = undefined
  if (object.metadata.annotations) {
    object.metadata.annotations['kubectl.kubernetes.io/last-applied-configuration'] = undefined
  }
  return object
}

function simplifyProject (project) {
  project = simplifyObjectMetadata(project)
  _.set(project, ['spec', 'members'], undefined)
  return project
}

function simplifySeed (seed) {
  return simplifyObjectMetadata(seed)
}

function parseSelector (selector = '') {
  let notOperator
  let key
  let operator
  let value = ''

  if (selector.startsWith('!')) {
    notOperator = '!'
    selector = selector.slice(1)
  }

  const index = selector.search(/[=!]/)
  if (index !== -1) {
    key = selector.slice(0, index)
    const remainingPart = selector.slice(index)
    if (remainingPart.startsWith('==')) {
      operator = '=='
      value = remainingPart.slice(2)
    } else if (remainingPart.startsWith('=')) {
      operator = '='
      value = remainingPart.slice(1)
    } else if (remainingPart.startsWith('!=')) {
      operator = '!='
      value = remainingPart.slice(2)
    } else {
      operator = ''
      value = remainingPart
    }
  } else {
    key = selector
  }

  const isValidPart = part => /^[a-zA-Z0-9._/-]*$/.test(part)

  if (!isValidPart(key) || !isValidPart(value)) {
    return
  }

  if (notOperator) {
    if (!operator) {
      return { op: NOT_EXISTS, key }
    }
  } else if (!operator) {
    return { op: EXISTS, key }
  } else if (operator === '!=') {
    return { op: NOT_EQUAL, key, value }
  } else if (operator === '=' || operator === '==') {
    return { op: EQUAL, key, value }
  }
}

function parseSelectors (selectors) {
  const items = []
  for (const selector of selectors) {
    const item = parseSelector(selector)
    if (item) {
      items.push(item)
    }
  }
  return items
}

function filterBySelectors (selectors) {
  return item => {
    const labels = item.metadata.labels ?? {}
    for (const { op, key, value } of selectors) {
      const labelValue = _.get(labels, [key], '')
      switch (op) {
        case NOT_EXISTS: {
          if (key in labels) {
            return false
          }
          break
        }
        case EXISTS: {
          if (!(key in labels)) {
            return false
          }
          break
        }
        case NOT_EQUAL: {
          if (labelValue === value) {
            return false
          }
          break
        }
        case EQUAL: {
          if (labelValue !== value) {
            return false
          }
          break
        }
      }
    }
    return true
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
  return _.get(seed, ['spec', 'ingress', 'domain'])
}

function isSeedUnreachable (seed) {
  const matchLabels = _.get(config, ['unreachableSeeds', 'matchLabels'])
  if (!matchLabels) {
    return false
  }
  return _.isMatch(seed, { metadata: { labels: matchLabels } })
}

module.exports = {
  decodeBase64,
  encodeBase64,
  isMemberOf,
  projectFilter,
  parseRooms,
  simplifyObjectMetadata,
  simplifyProject,
  simplifySeed,
  parseSelectors,
  filterBySelectors,
  getConfigValue,
  getSeedNameFromShoot,
  shootHasIssue,
  isSeedUnreachable,
  getSeedIngressDomain,
  constants: Object.freeze({
    EXISTS,
    NOT_EXISTS,
    EQUAL,
    NOT_EQUAL,
  }),
}
