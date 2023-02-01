//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { metrics } = require('./metrics')

function createWriteHead (prevWriteHead, listener) {
  let fired = false

  // return function with core name and argument list
  return function writeHead (...args) {
    const result = prevWriteHead.apply(this, args)
    if (!fired) {
      fired = true
      listener.call(this)
    }

    return result
  }
}

function monitorResponseTimes (defaultLabels = {}) {
  // see metrics.js for available defaultLabels/to add labels
  return (req, res, next) => {
    try {
      const { method } = req
      const endTimer = metrics.responseTime.startTimer({ ...defaultLabels, method })

      res.writeHead = createWriteHead(res.writeHead, () => endTimer())

      next()
    } catch (err) {
      next(err)
    }
  }
}

function monitorSocketIO (io) {
  const labels = { type: 'ws' }
  io.on('connection', (socket) => {
    metrics.connectionsCount.inc(labels, 1)
    metrics.connectionsTotal.inc(labels, 1)
    socket.once('disconnect', () => {
      metrics.connectionsCount.dec(labels, 1)
    })
  })
}

function monitorHttpServer (server) {
  const labels = { type: 'http' }
  server.on('request', ({ response }) => {
    metrics.connectionsCount.inc(labels, 1)
    metrics.connectionsTotal.inc(labels, 1)
    response.once('close', () => {
      metrics.connectionsCount.dec(labels, 1)
    })
  })
}

module.exports = {
  monitorResponseTimes,
  monitorSocketIO,
  monitorHttpServer
}
