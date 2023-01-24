//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const express = require('express')
const { requestLogger } = require('../middleware')
const { handleGithubEvent } = require('../github/webhookHandler')
const { parser } = require('../github/webhookParser')

const router = express.Router()

// This route comes with its own body parser and auth. It should be registered
// under a different path or before other (auth) middlewares and handlers.
router.route('/')
  .post([requestLogger, parser], async (req, res, next) => {
    try {
      const eventName = req.headers['x-github-event']
      const eventData = req.body

      await handleGithubEvent(eventName, eventData)
      res.status(204).end()
    } catch (err) {
      next(err)
    }
  })
  .all((req, res) => {
    res.set('Allow', 'POST').status(405).end()
  })

module.exports = router
