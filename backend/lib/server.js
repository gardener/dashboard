//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const http = require('http')
const pTimeout = require('p-timeout')
const delay = require('delay')
const terminus = require('@godaddy/terminus')

function toMilliseconds (seconds) {
  seconds = parseInt(seconds)
  if (isNaN(seconds)) {
    seconds = 10
  }
  return seconds * 1000 + 200
}

module.exports = function createServer (app) {
  const port = app.get('port')
  const periodSeconds = app.get('periodSeconds')
  const healthCheck = app.get('healthCheck')
  const logger = app.get('logger')
  const io = app.get('io')()
  const synchronizer = app.get('synchronizer')

  // create server
  const server = http.createServer(app)
  io.attach(server)
  terminus.createTerminus(server, {
    healthChecks: {
      '/healthz': () => healthCheck(false),
      '/healthz-transitive': () => healthCheck(true)
    },
    beforeShutdown () {
      // To not lose any connections, we delay the shutdown with the number of milliseconds
      // that's defined by the readiness probe in the deployment configuration.
      return delay(toMilliseconds(periodSeconds))
    },
    async onSignal () {
      logger.debug('Server is starting cleanup')
      try {
        await new Promise(resolve => io.close(resolve))
      } catch (err) {
        logger.error('Error during server cleanup', err.stack)
      }
    },
    onShutdown () {
      logger.debug('Cleanup has been finished. Server is shutting down')
    },
    logger (...args) {
      logger.error(...args)
    }
  })

  server.startListening = async () => {
    const begin = Date.now()
    try {
      await pTimeout(synchronizer(), 15 * 1000)
      const synchronizationDuration = Date.now() - begin
      logger.debug('Initial cache synchronization succeeded after %d ms', synchronizationDuration)
    } catch (err) {
      logger.warn('Initial cache synchronization timed out with: %s', err.message, err.stack)
    }
    await new Promise(resolve => server.listen(port, resolve))
    logger.info('Server listening on port %d', port)
  }
  return server
}
