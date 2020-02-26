//
// Copyright (c) 2019 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

'use strict'

const http = require('http')
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

  function onListening () {
    logger.info(`Server listening on port ${port}`)
  }

  server.startListening = () => {
    synchronizer()
    server.listen(port, onListening)
  }
  return server
}
