//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
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
  refreshToken,
  authorizeToken,
  clearCookies,
} = require('./security')
const { requestLogger } = require('./middleware')

// configure router
const router = exports.router = express.Router()

router.use(requestLogger)
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
      const {
        error = {},
        redirectPath,
      } = req.query
      const hash = error.message
        ? `#error=${encodeURIComponent(error.message)}`
        : ''
      const search = redirectPath
        ? `?redirectPath=${encodeURIComponent(redirectPath)}`
        : ''
      res.redirect(`/login${hash || search}`)
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

router.route('/token')
  .post(async (req, res, next) => {
    try {
      res.send(await refreshToken(req, res))
    } catch (err) {
      next(err)
    }
  })
