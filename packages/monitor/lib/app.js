//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const express = require('express')
const route = require('./route')
const hooks = require('./hooks')
const { Logger } = require('@gardener-dashboard/logger')

function createApp ({ port, periodSeconds }) {
  const logger = new Logger()

  const app = express()

  app.set('port', port)
  app.set('periodSeconds', periodSeconds)
  app.set('hooks', hooks)
  app.set('logger', logger)

  app.set('x-powered-by', false)

  app.use('/metrics', route)
  app.use('*', (req, res) => res.sendStatus(404))
  app.use((err, req, res, next) => {
    const { message, status = 500 } = err
    logger.error('Error in monitoring server: %s', message)
    res.status(status).json({
      status,
      message
    })
  })

  return app
}

module.exports = { createApp }
