//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { split, reduce, join } = require('lodash')
const { sign, encrypt, COOKIE_HEADER_PAYLOAD, COOKIE_SIGNATURE, COOKIE_TOKEN } = require('../../../lib/security')

async function getCookieValue (token) {
  const bearer = await token
  const [ header, payload, signature ] = split(bearer, '.')
  const encrypted = await encrypt(bearer)
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

module.exports = {
  createUser ({ id, aud = [ 'gardener' ], ...rest }, invalid) {
    const secret = invalid === true ? 'invalid-secret' : undefined // pragma: whitelist secret
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
}
