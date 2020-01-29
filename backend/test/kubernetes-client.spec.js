
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

const EventEmitter = require('events')
const { mix } = require('mixwith')
const pEvent = require('p-event')
const http = require('http')
const express = require('express')
const jwt = require('jsonwebtoken')

const logger = require('../lib/logger')
const mixins = require('../lib/kubernetes-client/mixins')
const WatchBuilder = require('../lib/kubernetes-client/WatchBuilder')
const HttpClient = require('../lib/kubernetes-client/HttpClient')
const { http: httpSymbols } = require('../lib/kubernetes-client/symbols')
const { attach, beforeRequest, beforeRedirect, afterResponse } = require('../lib/kubernetes-client/debug')
const { V1, V1Alpha1, V1Beta1, CoreGroup, NamedGroup, NamespaceScoped, ClusterScoped, Readable, Observable } = mixins

describe('kubernetes-client', function () {
  /* eslint no-unused-expressions: 0 */

  const sandbox = sinon.createSandbox()

  afterEach(function () {
    sandbox.restore()
  })

  describe('mixins', function () {
    it('should check that plain mixins do not occur in the inheritance hierarchy', function () {
      class V1Object extends V1(Object) {}
      expect(new V1Object()).to.have.nested.property('constructor.version', 'v1')
      expect(() => new V1Object() instanceof V1).to.throw(TypeError)

      class V1Alpha1Object extends V1Alpha1(Object) {}
      expect(new V1Alpha1Object()).to.have.nested.property('constructor.version', 'v1alpha1')
      expect(() => new V1Alpha1Object() instanceof V1Alpha1).to.throw(TypeError)

      class V1Beta1Object extends V1Beta1(Object) {}
      expect(new V1Beta1Object()).to.have.nested.property('constructor.version', 'v1beta1')
      expect(() => new V1Beta1Object() instanceof V1Beta1).to.throw(TypeError)

      class CoreGroupObject extends CoreGroup(Object) {}
      expect(() => new CoreGroupObject() instanceof CoreGroup).to.throw(TypeError)

      class NamedGroupObject extends NamedGroup(Object) {}
      expect(() => new NamedGroupObject() instanceof NamedGroup).to.throw(TypeError)
    })

    it('should check that declared mixins do occur in the inheritance hierarchy', function () {
      class ClusterScopedObject extends ClusterScoped(Object) {}
      expect(new ClusterScopedObject()).to.be.an.instanceof(ClusterScoped)

      class NamespaceScopedObject extends NamespaceScoped(Object) {}
      expect(new NamespaceScopedObject()).to.be.an.instanceof(NamespaceScoped)

      class ReadableNamespaceScopedObject extends Readable(NamespaceScopedObject) {}
      expect(new ReadableNamespaceScopedObject()).to.be.an.instanceof(Readable)

      class ReadableClusterScopedObject extends Readable(ClusterScopedObject) {}
      expect(new ReadableClusterScopedObject()).to.be.an.instanceof(Readable)
    })
  })

  describe('WatchBuilder', function () {
    describe('#create', function () {
      const url = 'https://kubernetes:443'

      async function consume (emitter, event, options) {
        const asyncIterator = pEvent.iterator(emitter, event, options)
        const results = []
        for await (const data of asyncIterator) {
          results.push(data)
        }
        return results
      }

      function map (events = [], key = 'type') {
        return events.map(event => event[key])
      }

      class WebSocket extends EventEmitter {
        constructor ({ pingInterval, pongDelay = -1 } = {}) {
          super()
          this._pingInterval = pingInterval
          this._pongDelay = pongDelay
          this.timeoutId = undefined
          this.pongTimeoutId = undefined
          this.open()
        }

        send (type, object) {
          process.nextTick(() => this.emit('message', JSON.stringify({ type, object })))
        }

        ping (data) {
          if (this._pongDelay === -1) {
            process.nextTick(() => this.emit('pong', data))
          } else {
            this.pongTimeoutId = setTimeout(() => this.emit('pong', data), this._pongDelay)
          }
        }

        throw (message) {
          process.nextTick(() => this.emit('error', new Error(message)))
        }

        open () {
          this.timeoutId = setTimeout(() => this.terminate(), 5000)
          process.nextTick(() => this.emit('open'))
        }

        terminate () {
          clearTimeout(this.timeoutId)
          clearTimeout(this.pongTimeoutId)
          process.nextTick(() => this.emit('close', 4000, 'Terminated'))
        }
      }

      class Foo extends V1(NamedGroup(HttpClient)) {
        static get group () {
          return 'foo'
        }
      }

      class Bar extends mix(Foo).with(ClusterScoped, Observable) {
        static get names () {
          return {
            plural: 'bars',
            singular: 'bar',
            kind: 'Bar'
          }
        }
      }

      let ws
      const options = {}
      let createWebSocketStub
      let searchParams
      let bar
      let reconnector

      beforeEach(function () {
        searchParams = new URLSearchParams()
        bar = new Bar({ url })
        Object.assign(options, {
          pingInterval: 5,
          pongDelay: -1,
          initialDelay: 3
        })
        createWebSocketStub = sandbox.stub(WatchBuilder, 'createWebSocket')
          .callsFake(() => {
            return (ws = new WebSocket(options))
          })
      })

      afterEach(function () {
        if (reconnector) {
          reconnector.disconnect()
        }
      })

      it('should consume three events', async function () {
        reconnector = bar.watchList()
        expect(createWebSocketStub).to.be.calledOnce
        const url = createWebSocketStub.firstCall.args[0]
        expect(url.pathname).to.equal('/apis/foo/v1/bars')
        expect(url.searchParams.get('watch')).to.equal('true')
        expect(reconnector.connected).to.be.false
        expect(reconnector.resourceName).to.equal(Bar.names.plural)
        await pEvent(reconnector, 'connect')
        expect(reconnector.connected).to.be.true
        const types = ['ADDED', 'DELETED', 'ERROR']
        for (const type of types) {
          ws.send(type, {})
        }
        const events = map(await consume(reconnector, 'event', { limit: 3 }))
        expect(events).to.eql(types)
        reconnector.disconnect()
        await pEvent(reconnector, 'disconnect')
        expect(reconnector.connected).to.be.false
      })

      it('should start the heartbeat', async function () {
        reconnector = bar.watch('baz')
        expect(createWebSocketStub).to.be.calledOnce
        const url = createWebSocketStub.firstCall.args[0]
        expect(url.pathname).to.equal('/apis/foo/v1/bars')
        expect(url.searchParams.get('fieldSelector')).to.equal('metadata.name=baz')
        await pEvent(reconnector, 'connect')
        expect(reconnector.connected).to.be.true
        await consume(ws, 'pong', { limit: 3 })
        reconnector.disconnect()
        await pEvent(reconnector, 'disconnect')
        expect(reconnector.connected).to.be.false
      })

      it('should automatically reconnect an unresponsive connection', async function () {
        options.pongDelay = 10
        searchParams.set('fieldSelector', 'foo=bar')
        reconnector = WatchBuilder.create(bar, Bar.names.plural, searchParams, 'baz', { initialDelay: 3 })
        expect(createWebSocketStub).to.be.calledOnce
        const url = createWebSocketStub.firstCall.args[0]
        expect(url.searchParams.get('fieldSelector')).to.equal('metadata.name=baz,foo=bar')
        await pEvent(reconnector, 'connect')
        expect(reconnector.connected).to.be.true
        await pEvent(reconnector, 'disconnect')
        expect(reconnector.connected).to.be.false
        await pEvent(reconnector, 'reconnect')
        expect(reconnector.connected).to.be.true
        reconnector.reconnect = false
        await pEvent(reconnector, 'disconnect')
        expect(reconnector.connected).to.be.false
      })

      it('should automatically reconnect a broken connection', async function () {
        reconnector = WatchBuilder.create(bar, Bar.names.plural, searchParams, 'baz', { initialDelay: 3 })
        await pEvent(reconnector, 'connect')
        expect(reconnector.connected).to.be.true
        ws.throw('broken')
        await pEvent(reconnector, 'disconnect')
        expect(reconnector.connected).to.be.false
        await pEvent(reconnector, 'reconnect', { timeout: 20 })
        expect(reconnector.connected).to.be.true
        reconnector.disconnect()
        await pEvent(reconnector, 'disconnect')
        expect(reconnector.connected).to.be.false
      })
    })

    describe('#createWebSocket', function () {
      it('should create a WebSocket instance', function () {
        const req = new EventEmitter()
        const getStub = sandbox.stub(http, 'get').returns(req)
        WatchBuilder.createWebSocket('http://kubernetes:8080')
        expect(getStub).to.be.calledOnce
      })
    })

    describe('#waitFor', function () {
      class Watch extends EventEmitter {
        constructor () {
          super()
          this.resourceName = 'bars'
        }

        send (type, object) {
          process.nextTick(() => this.emit('event', { type, object }))
        }

        disconnect () {}
      }

      const baz = { name: 'baz' }

      it('should assign the waitFor method', async function () {
        const watch = new Watch()
        WatchBuilder.setWaitFor(watch)
        expect(typeof watch.waitFor).to.equal('function')
        watch.send('ADDED', {})
        watch.send('ADDED', baz)
        const condition = ({ name }) => name === 'baz'
        const object = await watch.waitFor(condition)
        expect(object).to.eql(baz)
      })
    })
  })

  describe('HttpClient', function () {
    let server

    const app = express()
    app.get('/foo', (req, res) => {
      res.send('bar')
    })

    async function serve () {
      server = http.createServer(app).listen(0, 'localhost')
      await pEvent(server, 'listening', {
        timeout: 100
      })
      const { address, port } = server.address()
      return `http://${address}:${port}`
    }

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
    }

    after(function () {
      server.close()
    })

    it('should assert "beforeRequest" hook parameters', async function () {
      const origin = await serve()
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
  })

  describe('debug', function () {
    const uuidRegEx = /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/
    const url = new URL('https://kubernetes/foo/bar')
    const method = 'GET'
    const body = { ok: true }
    const statusCode = 200
    const statusMessage = 'Ok'
    const httpVersion = 'HTTP/1.1'
    const user = {
      user: 'hugo',
      password: 'secret',
      sub: 'foobar',
      email: 'foo@bar.com',
      bearer: '"redacted"',
      cn: 'foobar',
      cert: `-----BEGIN CERTIFICATE-----
MIIB3DCCAYagAwIBAgIUR4tYMxv8KYxP86VjN/qBs63hin8wDQYJKoZIhvcNAQEL
BQAwMTEPMA0GA1UEAwwGZm9vYmFyMQswCQYDVQQGEwJERTERMA8GA1UECgwIR2Fy
ZGVuZXIwIBcNMjAwMTE2MTE1NTQwWhgPMjExOTEyMjMxMTU1NDBaMDExDzANBgNV
BAMMBmZvb2JhcjELMAkGA1UEBhMCREUxETAPBgNVBAoMCEdhcmRlbmVyMFwwDQYJ
KoZIhvcNAQEBBQADSwAwSAJBANgAziJQ7j4Wr3PXpMVv54hZuVM5GQayApJyTrDS
fe7OYjpuqDItPlw28DwtAULw/j/yChXLNr+sAudsC2qTQ2sCAwEAAaN0MHIwHQYD
VR0OBBYEFMXsVnwnBJ7K4NSnkRt0IpVthT4HMB8GA1UdIwQYMBaAFMXsVnwnBJ7K
4NSnkRt0IpVthT4HMA4GA1UdDwEB/wQEAwIFoDAgBgNVHSUBAf8EFjAUBggrBgEF
BQcDAQYIKwYBBQUHAwIwDQYJKoZIhvcNAQELBQADQQCAiPJMH1azxaCTYYdglrAT
xrfonUDHQfXphOlk7VDCmkmXK0rEQUcA4wOgJgq84Tr9rHAcYGMvOZ/B6Gs+DmyI
-----END CERTIFICATE-----`,
      authorization (key) {
        if (key === 'cn') {
          return undefined
        }
        if (key === 'user') {
          return 'Basic ' + Buffer.from([this.user, this.password].join(':')).toString('base64')
        }
        if (key === 'bearer') {
          return 'Bearer <token>'
        }
        return 'Bearer ' + jwt.sign({ [key]: this[key] }, 'secret')
      }
    }

    let isDisabledStub
    let requestStub
    let responseStub

    beforeEach(function () {
      isDisabledStub = sandbox.stub(logger, 'isDisabled').returns(false)
      requestStub = sandbox.stub(logger, 'request')
      responseStub = sandbox.stub(logger, 'response')
    })

    it('should attach debug hooks', function () {
      const { hooks } = attach({})
      expect(isDisabledStub).to.be.calledOnce
      expect(hooks.beforeRequest[0]).to.equal(beforeRequest)
      expect(hooks.afterResponse[0]).to.equal(afterResponse)
      expect(hooks.beforeRedirect[0]).to.equal(beforeRedirect)
    })

    it('should log a http request', function () {
      const options = { url, method, headers: { foo: 'bar' }, body }

      beforeRequest(options)
      expect(requestStub).to.be.calledOnce
      const args = requestStub.firstCall.args[0]
      expect(args.url).to.equal(url)
      expect(args.method).to.equal(method)
      expect(args.body).to.equal(body)
      expect(args.user).to.be.undefined
      expect(args.headers.foo).to.equal('bar')
      expect(args.headers['x-request-id']).to.match(uuidRegEx)
    })

    it('should log the different types of users', function () {
      for (const key of ['user', 'email', 'sub', 'bearer', 'cn']) {
        requestStub.resetHistory()
        const authorization = user.authorization(key)
        const options = { url, method, headers: { authorization }, body }
        if (key === 'cn') {
          Object.assign(options, { key: 'key', cert: user.cert })
        }
        beforeRequest(options)
        expect(requestStub).to.be.calledOnce
        const args = requestStub.firstCall.args[0]
        expect(args.user).to.eql({ type: key, id: user[key] })
        expect(args.headers.authorization).to.equal(authorization)
      }
    })

    it('should log a http response', function () {
      const xRequestId = '42'
      const request = { options: { headers: { 'x-request-id': xRequestId } } }
      const headers = { foo: 'bar' }
      const response = { headers, httpVersion, statusCode, statusMessage, body, request }

      afterResponse(response)
      expect(responseStub).to.be.calledOnce
      const args = responseStub.firstCall.args[0]
      expect(args.id).to.equal(xRequestId)
      expect(args.statusCode).to.equal(statusCode)
      expect(args.statusMessage).to.equal(statusMessage)
      expect(args.httpVersion).to.equal(httpVersion)
      expect(args.headers.foo).to.equal('bar')
      expect(args.body).to.equal(body)
    })

    it('should log a http redirect', function () {
      const xRequestId = '42'
      const request = { options: { headers: { 'x-request-id': xRequestId } } }
      const headers = { foo: 'bar' }
      const options = { url, method, headers, body }
      const redirectUrls = ['http://foo.org/bar']
      const response = { headers, httpVersion, statusCode, statusMessage, redirectUrls, request }

      beforeRedirect(options, response)
      expect(responseStub).to.be.calledOnce
      expect(requestStub).to.be.calledOnce
      const args = responseStub.firstCall.args[0]
      expect(args.id).to.equal(xRequestId)
      expect(args.statusCode).to.equal(statusCode)
      expect(args.statusMessage).to.equal(statusMessage)
      expect(args.httpVersion).to.equal(httpVersion)
      expect(args.headers.foo).to.equal('bar')
      expect(JSON.parse(args.body)).to.eql({ redirectUrls })
    })
  })
})
