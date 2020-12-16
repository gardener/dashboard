//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { isPlainObject } = require('lodash')
const { promisify } = require('util')
const jwt = require('jsonwebtoken')
const { JWK, JWE } = require('jose')
const uuid = require('uuid')
const base64url = require('base64url')

const jwtSign = promisify(jwt.sign)
const jwtVerify = promisify(jwt.verify)

function importSymmetricKey (sessionSecret) {
  const use = 'enc'
  const decodedSessionSecret = decodeSecret(sessionSecret)
  return JWK.asKey(decodedSessionSecret, { use })
}

function decodeSecret (input) {
  let value = base64url.decode(input)
  if (base64url(value) === input) {
    return value
  }
  value = Buffer.from(input, 'base64')
  if (value.toString('base64') === input) {
    return value
  }
  return Buffer.from(input)
}

function encodeState (data = {}) {
  return base64url.encode(JSON.stringify(data))
}

function decodeState (state) {
  try {
    return JSON.parse(base64url.decode(state))
  } catch (err) {
    return {}
  }
}

module.exports = sessionSecret => {
  const symetricKey = importSymmetricKey(sessionSecret)
  return {
    encodeState,
    decodeState,
    sign (payload, secretOrPrivateKey, options) {
      if (isPlainObject(secretOrPrivateKey)) {
        options = secretOrPrivateKey
        secretOrPrivateKey = undefined
      }
      if (!secretOrPrivateKey) {
        secretOrPrivateKey = sessionSecret
      }
      const { expiresIn = '1d', jwtid = uuid.v1(), ...rest } = options || {}
      return jwtSign(payload, secretOrPrivateKey, { expiresIn, jwtid, ...rest })
    },
    verify (token, options) {
      return jwtVerify(token, sessionSecret, options)
    },
    decode (token) {
      return jwt.decode(token) || {}
    },
    encrypt (text) {
      return JWE.encrypt(text, symetricKey)
    },
    decrypt (data) {
      return JWE.decrypt(data, symetricKey).toString('ascii')
    }
  }
}
