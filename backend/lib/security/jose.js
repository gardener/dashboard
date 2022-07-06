//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { isPlainObject } = require('lodash')
const { promisify } = require('util')
const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const jose = require('jose')
const uuid = require('uuid')
const base64url = require('base64url')

const jwtSign = promisify(jwt.sign)
const jwtVerify = promisify(jwt.verify)

function importSymmetricKey (sessionSecret) {
  const decodedSessionSecret = decodeSecret(sessionSecret)
  return crypto.createSecretKey(decodedSessionSecret)
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
  const encoder = new TextEncoder()
  const decoder = new TextDecoder()
  return {
    encodeState,
    decodeState,
    sign (payload, secretOrPrivateKey, { expiresIn = '1d', jwtid = uuid.v1(), ...options } = {}) {
      if (isPlainObject(secretOrPrivateKey)) {
        options = secretOrPrivateKey
        secretOrPrivateKey = undefined
      }
      if (!secretOrPrivateKey) {
        secretOrPrivateKey = sessionSecret
      }
      if (!payload.exp) {
        options.expiresIn = expiresIn
      }
      if (!payload.jti) {
        options.jwtid = jwtid
      }
      return jwtSign(payload, secretOrPrivateKey, options)
    },
    verify (token, options) {
      return jwtVerify(token, sessionSecret, options)
    },
    decode (token) {
      return jwt.decode(token) || {}
    },
    encrypt (text) {
      const encodedText = encoder.encode(text)
      const protectedHeader = {
        enc: 'A128CBC-HS256',
        alg: 'PBES2-HS256+A128KW'
      }
      return new jose.CompactEncrypt(encodedText)
        .setProtectedHeader(protectedHeader)
        .encrypt(symetricKey)
    },
    async decrypt (data) {
      const { plaintext } = await jose.compactDecrypt(data, symetricKey)
      return decoder.decode(plaintext)
    }
  }
}
