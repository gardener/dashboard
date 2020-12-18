//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { split, join, reduce } = require('lodash')
const createError = require('http-errors')
const pathToRegexp = require('path-to-regexp')

const {
  COOKIE_HEADER_PAYLOAD,
  COOKIE_TOKEN,
  COOKIE_SIGNATURE
} = require('../lib/security/constants')
const jose = require('../lib/security/jose')
const { sessionSecret } = require('./config').default

const { sign, encrypt, decode } = jose(sessionSecret)

const iat = 1577836800
const expiresIn = '50y'
const jwtid = 'jti'

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

const auth = {
  createUser ({ id, aud = ['gardener'], ...rest }, invalid) {
    const secret = invalid === true
      ? 'invalid-secret'
      : undefined

    const bearer = sign({ id, iat, aud, ...rest }, secret, { expiresIn, jwtid })
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
  },
  getTokenPayload ({ authorization } = {}) {
    const [, token] = /^Bearer (.*)$/.exec(authorization)
    return decode(token)
  }
}

const mocks = {
  reviewSelfSubjectRules () {
    const match = pathToRegexp.match('/apis/authorization.k8s.io/v1/selfsubjectrulesreviews')
    return (headers, json) => {
      const matchResult = match(headers[':path'])
      if (matchResult === false) {
        return Promise.reject(createError(503))
      }
      const payload = auth.getTokenPayload(headers)
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
  },
  reviewSelfSubjectAccess ({ allowed = true } = {}) {
    const match = pathToRegexp.match('/apis/authorization.k8s.io/v1/selfsubjectaccessreviews')
    return (headers, json) => {
      const matchResult = match(headers[':path'])
      if (matchResult === false) {
        return Promise.reject(createError(503))
      }
      const { id } = auth.getTokenPayload(headers)
      const { resourceAttributes, nonResourceAttributes } = json.spec
      if (resourceAttributes) {
        const { resource } = resourceAttributes
        switch (resource) {
          case 'secrets':
            allowed = id === 'admin@example.org'
            break
        }
      }
      if (nonResourceAttributes) {
        // TODO
      }
      return Promise.resolve({
        ...json,
        status: {
          allowed
        }
      })
    }
  },
  reviewToken ({ domain = 'example.org' } = {}) {
    const match = pathToRegexp.match('/apis/authentication.k8s.io/v1/tokenreviews')
    return (headers, json) => {
      const matchResult = match(headers[':path'])
      if (matchResult === false) {
        return Promise.reject(createError(503))
      }
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
}

module.exports = {
  ...auth,
  mocks
}
