//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const EventEmitter = require('events')
const { mix } = require('mixwith')
const pEvent = require('p-event')
const http = require('http')

const mixins = require('../lib/mixins')
const WatchBuilder = require('../lib/WatchBuilder')
const HttpClient = require('../lib/HttpClient')

const { NamedGroup, ClusterScoped, V1, Observable } = mixins

describe('kube-client', () => {
  describe('WatchBuilder', () => {
    describe('#create', () => {
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

      beforeEach(() => {
        searchParams = new URLSearchParams()
        bar = new Bar({ url })
        Object.assign(options, {
          pingInterval: 5,
          pongDelay: -1,
          initialDelay: 3
        })
        createWebSocketStub = jest
          .spyOn(WatchBuilder, 'createWebSocket')
          .mockImplementation(() => {
            return (ws = new WebSocket(options))
          })
      })

      afterEach(() => {
        if (reconnector) {
          reconnector.disconnect()
        }
      })

      it('should consume three events', async () => {
        reconnector = bar.watchList()
        expect(createWebSocketStub).toHaveBeenCalledTimes(1)
        const [url] = createWebSocketStub.mock.calls[0]
        expect(url.pathname).toBe('/apis/foo/v1/bars')
        expect(url.searchParams.get('watch')).toBe('true')
        expect(reconnector.connected).toBe(false)
        expect(reconnector.resourceName).toBe(Bar.names.plural)
        await pEvent(reconnector, 'connect')
        expect(reconnector.connected).toBe(true)
        const types = ['ADDED', 'DELETED', 'ERROR']
        for (const type of types) {
          ws.send(type, {})
        }
        const events = map(await consume(reconnector, 'event', { limit: 3 }))
        expect(events).toEqual(types)
        reconnector.disconnect()
        await pEvent(reconnector, 'disconnect')
        expect(reconnector.connected).toBe(false)
      })

      it('should start the heartbeat', async () => {
        reconnector = bar.watch('baz')
        expect(createWebSocketStub).toHaveBeenCalledTimes(1)
        const [url] = createWebSocketStub.mock.calls[0]
        expect(url.pathname).toBe('/apis/foo/v1/bars')
        expect(url.searchParams.get('fieldSelector')).toBe('metadata.name=baz')
        await pEvent(reconnector, 'connect')
        expect(reconnector.connected).toBe(true)
        await consume(ws, 'pong', { limit: 3 })
        reconnector.disconnect()
        await pEvent(reconnector, 'disconnect')
        expect(reconnector.connected).toBe(false)
      })

      it('should automatically reconnect an unresponsive connection', async () => {
        options.pongDelay = 10
        searchParams.set('fieldSelector', 'foo=bar')
        reconnector = WatchBuilder.create(bar, Bar.names.plural, searchParams, 'baz', { initialDelay: 3 })
        expect(createWebSocketStub).toHaveBeenCalledTimes(1)
        const [url] = createWebSocketStub.mock.calls[0]
        expect(url.searchParams.get('fieldSelector')).toBe('metadata.name=baz,foo=bar')
        await pEvent(reconnector, 'connect')
        expect(reconnector.connected).toBe(true)
        await pEvent(reconnector, 'disconnect')
        expect(reconnector.connected).toBe(false)
        await pEvent(reconnector, 'reconnect')
        expect(reconnector.connected).toBe(true)
        reconnector.reconnect = false
        await pEvent(reconnector, 'disconnect')
        expect(reconnector.connected).toBe(false)
      })

      it('should automatically reconnect a broken connection', async () => {
        reconnector = WatchBuilder.create(bar, Bar.names.plural, searchParams, 'baz', { initialDelay: 3 })
        await pEvent(reconnector, 'connect')
        expect(reconnector.connected).toBe(true)
        ws.throw('broken')
        await pEvent(reconnector, 'disconnect')
        expect(reconnector.connected).toBe(false)
        await pEvent(reconnector, 'reconnect', { timeout: 20 })
        expect(reconnector.connected).toBe(true)
        reconnector.disconnect()
        await pEvent(reconnector, 'disconnect')
        expect(reconnector.connected).toBe(false)
      })
    })

    describe('#createWebSocket', () => {
      it('should create a WebSocket instance', () => {
        const req = new EventEmitter()
        const getStub = jest.spyOn(http, 'get').mockReturnValue(req)
        WatchBuilder.createWebSocket('http://kubernetes:8080')
        expect(getStub).toHaveBeenCalledTimes(1)
      })
    })

    describe('#waitFor', () => {
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

      it('should assign the waitFor method', async () => {
        const watch = new Watch()
        WatchBuilder.setWaitFor(watch)
        expect(typeof watch.waitFor).toBe('function')
        watch.send('ADDED', {})
        watch.send('ADDED', baz)
        const condition = ({ name }) => name === 'baz'
        const object = await watch.waitFor(condition)
        expect(object).toEqual(baz)
      })
    })
  })
})
