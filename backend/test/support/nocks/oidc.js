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

const _ = require('lodash')
const nock = require('nock')
const jsonwebtoken = require('jsonwebtoken')
const keypair = require('keypair')
const crypto = require('crypto')
const { pem2jwk } = require('pem-jwk')
const config = require('../../../lib/config')

const issuer = config.jwt.issuer
const bits = 1024
const e = 0x10001
const use = 'sig'
const alg = _.first(config.jwt.algorithms)
const expiresIn = 24 * 60 * 60
const audience = [config.jwt.audience]
const pairs = [
  {kid: randomKid(), ...keypair({bits, e})},
  {kid: randomKid(), ...keypair({bits, e})}
]
const invalidPair = {kid: randomKid(), ...keypair({bits, e})}
const keys = _
  .chain(pairs)
  .map(pair => ({use, alg, kid: pair.kid, ...pem2jwk(pair.public)}))
  .value()

function randomKid () {
  return crypto.randomBytes(20).toString('hex')
}

function sign (payload, invalid = false) {
  const index = Math.round(Math.random())
  const pair = !invalid ? pairs[index] : invalidPair
  return jsonwebtoken.sign({aud: audience, iss: issuer, ...payload}, pair.private, {algorithm: alg, keyid: pair.kid, expiresIn})
}

const stub = {
  getKeys () {
    return nock(issuer)
      .replyContentLength()
      .get('/keys')
      .reply(200, {keys})
  }
}

module.exports = {
  kid: pairs[0].kid,
  alg,
  issuer,
  audience,
  expiresIn,
  keys,
  sign,
  stub
}
