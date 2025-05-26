//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { isPlainObject, map } = require('lodash')
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

module.exports = sessionSecrets => {
  if (!sessionSecrets?.length) {
    throw new Error('No session secrets provided')
  }
  const [sessionSecret] = sessionSecrets
  const symmetricKeys = map(sessionSecrets, importSymmetricKey)
  const [symetricKey] = symmetricKeys
  const encoder = new TextEncoder()
  const decoder = new TextDecoder()
  return {
    sign (payload, secretOrPrivateKey, { ...options } = {}) {
      if (isPlainObject(secretOrPrivateKey)) {
        options = secretOrPrivateKey
        secretOrPrivateKey = undefined
      }
      if (!secretOrPrivateKey) {
        secretOrPrivateKey = sessionSecret
      }
      if (!payload.exp && !options.expiresIn) {
        options.expiresIn = '1d'
      }
      if (!payload.jti && !options.jwtid) {
        options.jwtid = uuid.v1()
      }
      return jwtSign(payload, secretOrPrivateKey, options)
    },
    async verify (token, options) {
      let firstError
      for (const sessionSecret of sessionSecrets) {
        try {
          return await jwtVerify(token, sessionSecret, options)
        } catch (err) {
          firstError ??= err
        }
      }
      throw firstError
    },
    decode (token) {
      return jwt.decode(token) || {}
    },
    encrypt (text) {
      const encodedText = encoder.encode(text)
      const protectedHeader = {
        enc: 'A128CBC-HS256',
        alg: 'PBES2-HS256+A128KW',
      }
      return new jose.CompactEncrypt(encodedText)
        .setProtectedHeader(protectedHeader)
        .encrypt(symetricKey)
    },
    async decrypt (data) {
      const options = {
        keyManagementAlgorithms: ['PBES2-HS256+A128KW'],
      }
      let firstError
      for (const symetricKey of symmetricKeys) {
        try {
          const { plaintext } = await jose.compactDecrypt(data, symetricKey, options)
          return decoder.decode(plaintext)
        } catch (err) {
          firstError ??= err
        }
      }
      throw firstError
    },
  }
}
