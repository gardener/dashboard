//
// Copyright (c) 2018 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

'use strict'

const { split, reduce } = require('lodash')
const { sign, encrypt, cookieHeaderPayload, cookieSignatureToken } = require('../../../lib/security')

async function getCookieValue (token) {
  const bearer = await token
  const [ header, payload, signature ] = split(bearer, '.')
  const encrypted = await encrypt(bearer)
  const cookies = {
    [cookieHeaderPayload]: `${header}.${payload}`,
    [cookieSignatureToken]: `${signature}.${encrypted}`
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
    const secret = invalid === true ? 'invalid-secret' : undefined
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
