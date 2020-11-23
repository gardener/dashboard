//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { split, join, reduce } = require('lodash')
const jose = require('../lib/security/jose')
const {
  COOKIE_HEADER_PAYLOAD,
  COOKIE_TOKEN,
  COOKIE_SIGNATURE
} = require('../lib/security/constants')
const config = require('./config')
const { gardenerHomeDirectory } = require('./helper')

const GARDENER_CONFIG = gardenerHomeDirectory()
const { sessionSecret } = config.get(GARDENER_CONFIG)
const { sign, encrypt } = jose(sessionSecret)

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
    get cookie () {
      return getCookieValue(bearer)
    },
    get bearer () {
      return bearer
    }
  }
}

module.exports = {
  createUser
}
