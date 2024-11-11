//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const createResponseTimeMiddleware = require('response-time')
const { connectionsCount, connectionsTotal, responseTime } = require('./metrics')

function monitorResponseTimes (additionalLabels = {}) {
  return createResponseTimeMiddleware((req, res, timeMs) => {
    const { method, metricsRoute } = req
    const { statusCode } = res
    const labels = {
      method,
      status_code: statusCode,
      ...additionalLabels,
    }
    if (metricsRoute) {
      labels.route = metricsRoute
    }
    responseTime.observe(labels, timeMs / 1000)
  })
}

function monitorSocketIO (io) {
  const labels = { type: 'ws' }
  io.on('connection', (socket) => {
    connectionsCount.inc(labels, 1)
    connectionsTotal.inc(labels, 1)
    socket.once('disconnect', () => {
      connectionsCount.dec(labels, 1)
    })
  })
}

function monitorHttpServer (server) {
  const labels = { type: 'http' }
  server.on('request', (req, res) => {
    connectionsCount.inc(labels, 1)
    connectionsTotal.inc(labels, 1)
    res.once('close', () => {
      connectionsCount.dec(labels, 1)
    })
  })
}

module.exports = {
  monitorResponseTimes,
  monitorSocketIO,
  monitorHttpServer,
}
