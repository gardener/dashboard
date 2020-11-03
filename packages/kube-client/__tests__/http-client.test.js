//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const pEvent = require('p-event')
const http = require('http')
const express = require('express')
const WebSocket = require('ws')

const HttpClient = require('../lib/HttpClient')
const {
  http: httpSymbols,
  ws: wsSymbols
} = require('../lib/symbols')

describe('kube-client', () => {
  describe('HttpClient', () => {
    let server
    let wss
    let origin
    let client

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

    beforeEach(async () => {
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

    afterEach(() => {
      wss.close()
      server.close()
      client[httpSymbols.agent].destroy()
    })

    it('should assert "beforeRequest" hook parameters', async () => {
      client = new TestClient(origin, {
        headers: {
          foo: 'bar'
        },
        hooks: {
          beforeRequest: [
            options => {
              const { url, method, headers } = options
              expect(url).toBeInstanceOf(URL)
              expect(url.origin).toBe(origin)
              expect(method).toBe('GET')
              expect(headers.foo).toBe('bar')
            }
          ]
        }
      })
      const body = await client.get()
      expect(body).toBe('bar')
    })

    it('should open a websocket echo socket', async () => {
      client = new TestClient(origin)
      const echoSocket = client.echo()
      await pEvent(echoSocket, 'open')
      echoSocket.send('foobar')
      const message = await pEvent(echoSocket, 'message')
      expect(message).toBe('foobar')
    })
  })
})
