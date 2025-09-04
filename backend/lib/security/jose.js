//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  isPlainObject,
  map,
} from 'lodash-es'
import { promisify } from 'util'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { v1 as uuidv1 } from 'uuid'
import base64url from 'base64url'

// ESM only depenedency jose must be wrapped in a dynamic import so that common js tests work
// TODO Remove when we switch to ESM tests
let josePromise = null
async function getJose () {
  if (!josePromise) {
    josePromise = import('jose')
  }
  return josePromise
}

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

export default function createJose (sessionSecrets) {
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
        options.jwtid = uuidv1()
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
    async encrypt (text) {
      const encodedText = encoder.encode(text)
      const protectedHeader = {
        enc: 'A128CBC-HS256',
        alg: 'PBES2-HS256+A128KW',
      }
      const jose = await getJose()
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
          const jose = await getJose()
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
