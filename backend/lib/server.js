//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import http from 'http'
import pTimeout from 'p-timeout'
import terminus from '@godaddy/terminus'

function toMilliseconds (seconds) {
  seconds = parseInt(seconds)
  if (isNaN(seconds)) {
    seconds = 10
  }
  return seconds * 1000 + 200
}

function createServer (app, metricsApp) {
  const port = app.get('port')
  const metricsPort = app.get('metricsPort')
  const periodSeconds = app.get('periodSeconds')
  const healthCheckFunc = app.get('healthCheck')
  const logger = app.get('logger')
  const hooks = app.get('hooks')

  // create server
  const server = http.createServer(app)
  const metricsServer = http.createServer(metricsApp)

  // create terminus
  const healthChecks = {
    '/healthz': () => healthCheckFunc(false),
    '/healthz-transitive': () => healthCheckFunc(true),
  }

  terminus.createTerminus(server, {
    healthChecks,
    beforeShutdown () {
      // To not lose any connections, we delay the shutdown with the number of milliseconds
      // that's defined by the readiness probe in the deployment configuration.
      return new Promise(resolve => setTimeout(resolve, toMilliseconds(periodSeconds)))
    },
    async onSignal () {
      logger.debug('Server is starting cleanup')
      try {
        await hooks.cleanup()
      } catch (err) {
        logger.error('Error during server cleanup', err.stack)
      }
    },
    onShutdown () {
      logger.debug('Cleanup has been finished. Server is shutting down')
      metricsApp.destroy()
    },
    logger (...args) {
      logger.error(...args)
    },
  })

  return {
    async run () {
      await new Promise(resolve => metricsServer.listen(metricsPort, resolve))
      logger.info('Metrics server listening on port %d', metricsPort)

      const begin = Date.now()

      try {
        await pTimeout(hooks.beforeListen(server), 15 * 1000)
        const milliseconds = Date.now() - begin
        logger.debug('Before listen hook succeeded after %d ms', milliseconds)
      } catch (err) {
        logger.warn('Before listen hook timed out: %s', err.message)
      }
      await new Promise(resolve => server.listen(port, resolve))
      logger.info('Server listening on port %d', port)
    },
  }
}

export default createServer
