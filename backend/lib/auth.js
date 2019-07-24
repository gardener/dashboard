//
// Copyright (c) 2019 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file
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

const express = require('express')
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser')
const {
  authorizationUrl,
  authorizationCallback,
  authorizeToken,
  clearCookies,
  encodeState,
  decodeState
} = require('./security')

// configure router
const router = exports.router = express.Router()

router.use(cookieParser())
router.use(bodyParser.json())
router.route('/')
  .get(async (req, res, next) => {
    const { failureRedirect = '/login' } = req.query
    try {
      res.redirect(await authorizationUrl(encodeState(req.query)))
    } catch (err) {
      res.redirect(`${failureRedirect}#error=${encodeURIComponent(err.message)}`)
    }
  })
  .post(async (req, res, next) => {
    try {
      res.send(await authorizeToken(req.body, res.cookie.bind(res)))
    } catch (err) {
      next(err)
    }
  })

router.route('/logout')
  .get(async (req, res, next) => {
    try {
      clearCookies(res.clearCookie.bind(res))
      const { returnTo = '/login', error = {} } = req.query
      const hash = error.message ? `#error=${encodeURIComponent(error.message)}` : ''
      res.redirect(`${returnTo}${hash}`)
    } catch (err) {
      next(err)
    }
  })

router.route('/callback')
  .get(async (req, res, next) => {
    let failureRedirect = '/login'
    let successRedirect = '/'
    try {
      const { code, state } = req.query
      const authQuery = decodeState(state)
      // use failureRedirect from state
      if (authQuery.failureRedirect) {
        failureRedirect = authQuery.failureRedirect
      }
      // use successRedirect from state
      if (authQuery.redirectPath) {
        successRedirect = authQuery.redirectPath
      } else if (authQuery.successRedirect) {
        successRedirect = authQuery.successRedirect
      }
      await authorizationCallback(code, res.cookie.bind(res))
      res.redirect(successRedirect)
    } catch (err) {
      res.redirect(`${failureRedirect}#error=${encodeURIComponent(err.message)}`)
    }
  })
