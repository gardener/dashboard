//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  split,
  join,
  reduce,
} from 'lodash-es'
import createError from 'http-errors'
import pathToRegexp from 'path-to-regexp'

import {
  COOKIE_HEADER_PAYLOAD,
  COOKIE_TOKEN,
  COOKIE_SIGNATURE,
} from '../../lib/security/constants.js'
import jose from '../../lib/security/jose.js'
import config from './config.js'

const { sessionSecrets } = config.default

const { sign, encrypt, decode } = jose(sessionSecrets)

const iat = 1577836800
const expiresIn = '50y'
const jwtid = 'jti'

async function getCookieValue (accessToken, idToken = accessToken) {
  const [bearer, encryptedBearer] = await Promise.all([accessToken, idToken])
  const [header, payload, signature] = split(bearer, '.')
  const encrypted = await encrypt(encryptedBearer)
  const cookies = {
    [COOKIE_HEADER_PAYLOAD]: join([header, payload], '.'),
    [COOKIE_SIGNATURE]: signature,
    [COOKIE_TOKEN]: encrypted,
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
  createUser ({ id, aud = ['gardener'], groups, bearerId, ...rest }, invalid) {
    const secret = invalid === true
      ? 'invalid-secret'
      : undefined

    const options = {}
    if (!rest.exp) {
      options.expiresIn = expiresIn
    }
    if (!rest.jti) {
      options.jwtid = jwtid
    }
    const accessToken = sign({ id, iat, aud, ...rest }, secret, options)
    const idTokenPayload = {
      id: bearerId ?? id,
      iat,
      aud,
      ...rest,
    }
    if (groups !== undefined) {
      idTokenPayload.groups = groups
    }
    const idToken = (groups !== undefined || bearerId !== undefined)
      ? sign(idTokenPayload, secret, options)
      : accessToken
    return {
      isAdmin () {
        return /^admin/.test(id)
      },
      get cookie () {
        return getCookieValue(accessToken, idToken)
      },
      get bearer () {
        return idToken
      },
    }
  },
  getTokenPayload ({ authorization } = {}) {
    const [, token] = /^Bearer (.*)$/.exec(authorization)
    return decode(token)
  },
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
          resourceName: ['foo'],
        })
        resourceRules.push({
          verbs: ['create'],
          apiGroups: ['core.gardener.cloud'],
          resources: ['projects'],
        })
      } else {
        resourceRules.push({
          verbs: ['get'],
          apiGroups: ['core.gardener.cloud'],
          resources: ['projects'],
          resourceName: ['foo'],
        })
      }
      return {
        ...json,
        status: {
          resourceRules,
          nonResourceRules,
          incomplete,
        },
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
        const { resource, namespace } = resourceAttributes
        switch (resource) {
          case 'secrets':
            allowed = id === 'admin@example.org' ||
              (id === 'foo@example.org' && namespace === 'garden-foo')
            break
          case 'projects':
            allowed = id === 'admin@example.org' || id === 'projects-viewer@example.org'
            break
        }
      }
      if (nonResourceAttributes) {
        // TODO
      }
      return Promise.resolve({
        ...json,
        status: {
          allowed,
        },
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
      const { id, sub, email, groups } = decode(token)
      const username = id || sub || email
      const authenticated = username.endsWith(domain)
      const user = authenticated ? { username, groups } : {}
      return Promise.resolve({
        status: {
          user,
          authenticated,
        },
      })
    }
  },
}

const { createUser, getTokenPayload } = auth

export default {
  ...auth,
  mocks,
}
export {
  auth,
  mocks,
  createUser,
  getTokenPayload,
}
