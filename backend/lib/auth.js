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

const querystring = require('querystring')
const express = require('express')
const { Issuer } = require('openid-client')
const { authentication } = require('./services')
/* eslint-disable camelcase */
const { oidc: { issuer, redirect_uri, scope, client_id, client_secret } = {} } = require('./config')
const response_type = 'code'
/* eslint-enable camelcase */

// configure router
const router = exports.router = express.Router()

const clientPromise = (async () => {
  const { Client } = await Issuer.discover(issuer)
  const client = new Client({client_id, client_secret})
  client.CLOCK_TOLERANCE = 15
  return client
})()

router.route('/')
  .get(async (req, res, next) => {
    try {
      const client = await clientPromise
      res.redirect(client.authorizationUrl({ redirect_uri, scope }))
    } catch (err) {
      next(err)
    }
  })

router.route('/callback')
  .get(async (req, res, next) => {
    try {
      const client = await clientPromise
      const tokenSet = await client.authorizationCallback(redirect_uri, req.query, { response_type, state: '' })
      const { username, groups } = await authentication.isAuthenticated({ token: tokenSet.id_token })
      tokenSet.username = username
      tokenSet.groups = groups
      res.redirect(`/callback#${querystring.stringify(tokenSet)}`)
    } catch (err) {
      next(err)
    }
  })
