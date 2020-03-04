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

const mixins = require('../lib/kubernetes-client/mixins')
const WatchBuilder = require('../lib/kubernetes-client/WatchBuilder')
const HttpClient = require('../lib/kubernetes-client/HttpClient')

const { NamedGroup, ClusterScoped, V1, Observable } = mixins

describe('kubernetes-client', function () {
  /* eslint no-unused-expressions: 0 */

  const sandbox = sinon.createSandbox()

  afterEach(function () {
    sandbox.restore()
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
})
