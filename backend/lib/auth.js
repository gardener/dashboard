//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const express = require('express')
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser')
const {
  authorizationUrl,
  authorizationCallback,
  authorizeToken,
  clearCookies
} = require('./security')

// configure router
const router = exports.router = express.Router()

router.use(cookieParser())
router.use(bodyParser.json())
router.route('/')
  .get(async (req, res, next) => {
    try {
      res.redirect(await authorizationUrl(req, res))
    } catch (err) {
      res.redirect(`/login#error=${encodeURIComponent(err.message)}`)
    }
  })
  .post(async (req, res, next) => {
    try {
      res.send(await authorizeToken(req, res))
    } catch (err) {
      next(err)
    }
  })

router.route('/logout')
  .get(async (req, res, next) => {
    try {
      clearCookies(res)
      const { error = {} } = req.query
      const hash = error.message ? `#error=${encodeURIComponent(error.message)}` : ''
      res.redirect(`/login${hash}`)
    } catch (err) {
      next(err)
    }
  })

router.route('/callback')
  .get(async (req, res, next) => {
    try {
      const { redirectPath = '/' } = await authorizationCallback(req, res)
      res.redirect(redirectPath)
    } catch (err) {
      res.redirect(`/login#error=${encodeURIComponent(err.message)}`)
    }
  })
