//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import express from 'express'
import bodyParser from 'body-parser'
import cookieParser from 'cookie-parser'
import logger from './logger/index.js'
import {
  authorizationUrl,
  authorizationCallback,
  refreshToken,
  authorizeToken,
  clearCookies,
} from './security/index.js'
import { requestLogger } from './middleware.js'

const router = express.Router()

router.use(requestLogger)
router.use(cookieParser())
router.use(bodyParser.json())
router.route('/')
  .get(async (req, res, next) => {
    try {
      res.redirect(await authorizationUrl(req, res))
    } catch (err) {
      logger.error('failed to redirect to authorization url: %s', err)
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
      logger.error('Error during authorization callback: %s', err)
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

export { router }
