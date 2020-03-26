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

const { Server } = require('http')
const delay = require('delay')
const createServer = require('../lib/server')

function createApplication (port) {
  const app = (req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' })
    res.end('ok', 'utf8')
  }
  app.synchronizing = false
  app.io = {}
  app.log = []
  app.get = key => {
    switch (key) {
      case 'port':
        return port
      case 'periodSeconds':
        return 1
      case 'logger':
        return {
          log (...args) {
            app.log.push(['log', ...args])
          },
          error (...args) {
            app.log.push(['error', ...args])
          },
          info (...args) {
            app.log.push(['info', ...args])
          }
        }
      case 'healthCheck':
        return (req, res) => {
          res.writeHead(200, { 'Content-Type': 'text/plain' })
          res.end('ok', 'utf8')
        }
      case 'io':
        return () => {
          return {
            attach (server) {
              app.io.server = server
            }
          }
        }
      case 'synchronizer':
        return () => {
          app.synchronizing = true
          return delay(1)
        }
    }
  }
  return app
}

describe('server', function () {
  /* eslint no-unused-expressions: 0 */
  const port = 1234

  it('should create a server', async function () {
    const app = createApplication(port)
    const server = createServer(app)
    expect(server).to.be.instanceof(Server)
    expect(server).to.equal(app.io.server)
    try {
      await server.startListening()
      expect(app.synchronizing).to.be.true
      expect(app.log[0].slice(0, 2)).to.eql(['info', 'Initial cache synchronization succeeded after %s'])
      expect(app.log[1].slice(0, 3)).to.eql(['info', 'Server listening on port %d', port])
    } finally {
      server.close()
    }
  })
})
