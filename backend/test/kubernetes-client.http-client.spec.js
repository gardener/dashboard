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

const pEvent = require('p-event')
const http = require('http')
const express = require('express')
const WebSocket = require('ws')

const HttpClient = require('../lib/kubernetes-client/HttpClient')
const {
  http: httpSymbols,
  ws: wsSymbols
} = require('../lib/kubernetes-client/symbols')

describe('kubernetes-client', function () {
  /* eslint no-unused-expressions: 0 */

  const sandbox = sinon.createSandbox()

  afterEach(function () {
    sandbox.restore()
  })

  describe('HttpClient', function () {
    let server
    let wss
    let origin

    const app = express()
    app.get('/foo', (req, res) => {
      res.send('bar')
    })

    class TestClient extends HttpClient {
      constructor (url, options) {
        super({
          url,
          throwHttpErrors: true,
          resolveBodyOnly: true,
          ...options
        })
      }

      get () {
        return this[httpSymbols.request]('foo', { method: 'get' })
      }

      echo (options) {
        const searchParams = new URLSearchParams(options)
        return this[wsSymbols.connect]('echo', { searchParams })
      }
    }

    beforeEach(async function () {
      server = http.createServer(app)
      wss = new WebSocket.Server({ server, path: '/echo' })
      wss.on('connection', socket => {
        socket.on('message', message => socket.send(message))
      })
      server.listen(0, 'localhost')
      await pEvent(server, 'listening', {
        timeout: 200
      })
      const { address, port } = server.address()
      origin = `http://${address}:${port}`
    })

    afterEach(function () {
      wss.close()
      server.close()
    })

    it('should assert "beforeRequest" hook parameters', async function () {
      const client = new TestClient(origin, {
        headers: {
          foo: 'bar'
        },
        hooks: {
          beforeRequest: [
            options => {
              const { url, method, headers } = options
              expect(url).to.be.instanceof(URL)
              expect(url.origin).to.equal(origin)
              expect(method).to.equal('GET')
              expect(headers.foo).to.equal('bar')
            }
          ]
        }
      })
      const body = await client.get()
      expect(body).to.equal('bar')
    })

    it('should open a websocket echo socket', async function () {
      const client = new TestClient(origin)
      const echoSocket = client.echo()
      await pEvent(echoSocket, 'open')
      echoSocket.send('foobar')
      const message = await pEvent(echoSocket, 'message')
      expect(message).to.equal('foobar')
    })
  })
})
