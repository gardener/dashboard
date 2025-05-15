//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import express from 'express'
import promClient from 'prom-client'
import createError from 'http-errors'
import logger from './logger.js'

const { register } = promClient

promClient.collectDefaultMetrics()

const app = express()
app.set('x-powered-by', false)
app.get('/metrics', async (req, res, next) => {
  try {
    const metrics = await register.metrics()
    res
      .set({
        'cache-control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'content-type': register.contentType,
      })
      .send(metrics)
  } catch (err) {
    next(err)
  }
})
app.use((req, res, next) => {
  next(createError(404, `No matching route: ${req.method} ${req.originalUrl}`))
})
app.use((err, req, res, next) => {
  const { message, status = 500 } = err
  logger.error('Error in monitoring server: %s', message)
  res.status(status).json({
    status,
    message,
  })
})

app.destroy = () => register.clear()

export default app
