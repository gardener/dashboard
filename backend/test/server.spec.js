//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
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
          debug (...args) {
            app.log.push(['debug', ...args])
          },
          log (...args) {
            app.log.push(['log', ...args])
          },
          warn (...args) {
            app.log.push(['warn', ...args])
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
      expect(app.log[0].slice(0, 2)).to.eql(['debug', 'Initial cache synchronization succeeded after %d ms'])
      expect(app.log[1].slice(0, 3)).to.eql(['info', 'Server listening on port %d', port])
    } finally {
      server.close()
    }
  })
})
