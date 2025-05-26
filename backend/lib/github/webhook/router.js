//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import express from 'express'
import bodyParser from 'body-parser'
import { requestLogger } from '../../middleware.js'
import monitorModule from '@gardener-dashboard/monitor'
import handleGithubEvent from './handler.js'
import verify from './verify.js'
const { monitorResponseTimes } = monitorModule

const router = express.Router()

// This route comes with its own body parser and auth. It should be registered
// under a different path or before other (auth) middlewares and handlers.
const middlewares = [
  requestLogger,
  monitorResponseTimes(),
  bodyParser.json({ verify }),
]

router.route('/')
  .post(middlewares, async (req, res, next) => {
    try {
      const eventName = req.headers['x-github-event']
      await handleGithubEvent(eventName)
      res.status(204).end()
    } catch (err) {
      next(err)
    }
  })
  .all((req, res) => {
    res.set('Allow', 'POST').status(405).end()
  })

export default router
