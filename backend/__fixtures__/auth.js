//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { split, join, reduce } = require('lodash')
const {
  COOKIE_HEADER_PAYLOAD,
  COOKIE_TOKEN,
  COOKIE_SIGNATURE
} = require('../lib/security/constants')
const jose = require('../lib/security/jose')
const { sessionSecret } = require('./config').default

const { sign, encrypt, decode } = jose(sessionSecret)

async function getCookieValue (token) {
  const bearer = await token
  const [header, payload, signature] = split(bearer, '.')
  const encrypted = encrypt(bearer)
  const cookies = {
    [COOKIE_HEADER_PAYLOAD]: join([header, payload], '.'),
    [COOKIE_SIGNATURE]: signature,
    [COOKIE_TOKEN]: encrypted
  }
  return reduce(cookies, (accumulator, value, key) => {
    if (accumulator) {
      accumulator += ';'
    }
    accumulator += key + '=' + value
    return accumulator
  }, '')
}

function createUser ({ id, aud = ['gardener'], ...rest }, invalid) {
  const secret = invalid === true
    ? 'invalid-secret'
    : undefined
  const bearer = sign({ id, aud, ...rest }, secret)
  return {
    isAdmin () {
      return /^admin/.test(id)
    },
    get cookie () {
      return getCookieValue(bearer)
    },
    get bearer () {
      return bearer
    }
  }
}

function reviewSelfSubjectRules () {
  return (headers, json) => {
    const [, token] = /^Bearer (.*)$/.exec(headers.authorization)
    const payload = fixtures.auth.decode(token)
    const resourceRules = []
    const nonResourceRules = []
    const incomplete = false
    if (/example\.org$/.test(payload.id)) {
      resourceRules.push({
        verbs: ['get'],
        apiGroups: ['core.gardener.cloud'],
        resources: ['projects'],
        resourceName: ['foo']
      })
      resourceRules.push({
        verbs: ['create'],
        apiGroups: ['core.gardener.cloud'],
        resources: ['projects']
      })
    } else {
      resourceRules.push({
        verbs: ['get'],
        apiGroups: ['core.gardener.cloud'],
        resources: ['projects'],
        resourceName: ['foo']
      })
    }
    return {
      ...json,
      status: {
        resourceRules,
        nonResourceRules,
        incomplete
      }
    }
  }
}

function reviewSelfSubjectAccess ({ allowed = true } = {}) {
  return (headers, json) => Promise.resolve({
    ...json,
    status: {
      allowed
    }
  })
}

function reviewToken ({ domain = 'example.org' } = {}) {
  return (headers, json) => {
    const { spec: { token } } = json
    const { id: username, groups } = decode(token)
    const authenticated = username.endsWith(domain)
    const user = authenticated ? { username, groups } : {}
    return Promise.resolve({
      status: {
        user,
        authenticated
      }
    })
  }
}

module.exports = {
  decode,
  createUser,
  reviewSelfSubjectAccess,
  reviewSelfSubjectRules,
  reviewToken
}
