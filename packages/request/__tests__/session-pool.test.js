//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const EventEmitter = require('events')
const http2 = require('http2')
const crypto = require('crypto')

const SessionId = require('../lib/SessionId')
const SessionPool = require('../lib/SessionPool')

jest.useFakeTimers()

const { getOwnSymbolProperty } = fixtures.helper
const {
  NGHTTP2_CANCEL
} = http2.constants

class MockEmitter {
  constructor () {
    this.emitter = new EventEmitter()
    const impl = key => {
      return (...args) => this.emitter[key](...args)
    }
    const spies = ['on', 'once', 'removeListener', 'removeAllListeners']
    for (const key of spies) {
      this[key] = jest.fn().mockImplementation(impl(key))
    }
    const keys = ['emit']
    for (const key of keys) {
      this[key] = impl(key)
    }
  }
}

class MockTLSSocket extends MockEmitter {}

class MockHttp2Stream extends MockEmitter {}

class MockHttp2Session extends MockEmitter {
  constructor (authority, { peerMaxConcurrentStreams = 100 } = {}) {
    super()
    this.authority = authority
    this.remoteSettings = {
      maxConcurrentStreams: peerMaxConcurrentStreams
    }
    this.socket = new MockTLSSocket()
    this.destroy = jest.fn()
    this.close = jest.fn()
    this.pong = jest.fn()
      .mockReturnValueOnce(7)
      .mockImplementation(() => {
        throw new Error('pong error')
      })
    this.ping = jest.fn()
      .mockImplementation(callback => {
        try {
          callback(null, this.pong())
        } catch (err) {
          callback(err)
        }
      })
    this.request = jest.fn((...args) => new MockHttp2Stream(...args))
    this.setTimeout = jest.fn()
  }
}

describe('SessionPool', () => {
  const authority = 'https://foo.org'
  const tlsSession = crypto.randomBytes(16)
  let options
  let sid
  let pool
  let mockHttp2Connect

  beforeEach(() => {
    options = {
      peerMaxConcurrentStreams: 100,
      maxOutstandingPings: 2,
      keepAliveTimeout: 60000,
      connectTimeout: 15000,
      pingInterval: false
    }
    sid = new SessionId(authority, options)
    sid.getOptions = jest.fn().mockReturnValue(options)
    pool = new SessionPool(sid)
    mockHttp2Connect = jest
      .spyOn(http2, 'connect')
      .mockImplementation((...args) => {
        return new MockHttp2Session(...args)
      })
  })

  describe('#constructor', () => {
    it('should create an agent instance with defaults', () => {
      expect(pool.id).toBe(sid)
      expect(pool.options).toBe(options)
      expect(pool.keepAliveTimeout).toBe(options.keepAliveTimeout)
      expect(pool.connectTimeout).toBe(options.connectTimeout)
      expect(pool.pingInterval).toBe(options.pingInterval)
      expect(pool.sessions).toBeInstanceOf(Set)
      expect(pool.sessions.size).toBe(0)
      expect(pool.queue).toBeInstanceOf(Array)
      expect(pool.queue.length).toBe(0)
      expect(pool.tlsSession).toBeUndefined()
      expect(pool.value).toBe(0)
    })
  })

  describe('#createSession', () => {
    it('should create and close a session', async () => {
      const sessionPromise = pool.createSession()

      // create http2 session
      expect(mockHttp2Connect).toBeCalledTimes(1)
      expect(mockHttp2Connect.mock.calls[0]).toEqual([
        sid.origin,
        expect.objectContaining({
          peerMaxConcurrentStreams: options.peerMaxConcurrentStreams,
          maxOutstandingPings: options.maxOutstandingPings,
          servername: sid.hostname
        })
      ])
      const session = mockHttp2Connect.mock.results[0].value
      const socket = session.socket
      const semaphore = getOwnSymbolProperty(session, 'semaphore')
      const setMaxConcurrencySpy = jest.spyOn(semaphore, 'maxConcurrency', 'set')

      // connect timeout
      expect(setTimeout).toBeCalledTimes(1)
      expect(setTimeout.mock.calls[0]).toEqual([
        expect.any(Function), options.connectTimeout
      ])
      const connectTimeoutId = setTimeout.mock.results[0].value
      setTimeout.mockClear()

      // listening once 'session' event
      expect(socket.once).toBeCalledTimes(1)
      expect(socket.once.mock.calls[0]).toEqual([
        'session', expect.any(Function)
      ])
      socket.emit('session', tlsSession)
      expect(pool.tlsSession).toBe(tlsSession)
      socket.once.mockClear()

      // listening on the 'error' and 'connect' event
      expect(session.once).toBeCalledTimes(2)
      expect(session.once.mock.calls).toEqual([
        ['error', expect.any(Function)],
        ['connect', expect.any(Function)]
      ])
      session.once.mockClear()

      // connect session
      session.emit('connect')

      // remove all listener
      expect(session.removeAllListeners).toBeCalledTimes(1)
      expect(session.removeAllListeners.mock.calls[0]).toEqual([
        'error'
      ])
      session.removeAllListeners.mockClear()

      // clear connect timeout
      expect(clearTimeout).toBeCalledTimes(2)
      expect(clearTimeout.mock.calls).toEqual([
        [connectTimeoutId],
        [undefined]
      ])
      clearTimeout.mockClear()

      // listening on 'remoteSettings' and 'error' events
      expect(session.on).toBeCalledTimes(2)
      expect(session.on.mock.calls).toEqual([
        ['remoteSettings', expect.any(Function)],
        ['error', expect.any(Function)]
      ])
      session.on.mockClear()

      // listening on the 'close' event
      expect(session.once).toBeCalledTimes(1)
      expect(session.once.mock.calls).toEqual([
        ['close', expect.any(Function)]
      ])
      session.once.mockClear()

      // keep-alive timeout
      expect(setTimeout).toBeCalledTimes(1)
      expect(setTimeout.mock.calls[0]).toEqual([
        expect.any(Function), options.keepAliveTimeout
      ])
      const keepAliveTimeoutId = setTimeout.mock.results[0].value
      setTimeout.mockClear()

      // session added
      expect(pool.sessions.size).toBe(1)
      expect(pool.value).toBe(semaphore.value)

      // promise resolved
      await expect(sessionPromise).resolves.toBeUndefined()

      // receive remote settings
      session.remoteSettings.maxConcurrentStreams = 250
      session.emit('remoteSettings', session.remoteSettings)

      // second update of maxConcurrency
      expect(setMaxConcurrencySpy).toBeCalledTimes(1)
      expect(setMaxConcurrencySpy.mock.calls[0]).toEqual([
        session.remoteSettings.maxConcurrentStreams
      ])

      // close session
      session.emit('close')

      // session deleted
      expect(pool.sessions.size).toBe(0)

      // clear keep-alive timeout
      expect(clearTimeout).toBeCalledTimes(1)
      expect(clearTimeout.mock.calls[0]).toEqual([
        keepAliveTimeoutId
      ])
      clearTimeout.mockClear()

      // clear heartbeat interval
      expect(clearInterval).toBeCalledTimes(1)
      expect(clearInterval.mock.calls[0]).toEqual([
        undefined
      ])
      clearInterval.mockClear()

      // session destroyed
      expect(session.destroy).toBeCalledTimes(1)
      expect(session.destroy.mock.calls[0]).toEqual([])
    })
  })

  describe('#setSessionHeartbeat', () => {
    beforeEach(() => {
      options.pingInterval = 100
    })
    it('should initialize the session heartbeat', () => {
      const session = new MockHttp2Session()
      pool.sessions.add(session)
      pool.setSessionHeartbeat(session)
      // heartbeat interval
      expect(setInterval).toBeCalledTimes(1)
      expect(setInterval.mock.calls[0]).toEqual([
        expect.any(Function), pool.pingInterval
      ])
      const intervalId = setInterval.mock.results[0].value
      setInterval.mockClear()

      jest.advanceTimersByTime(2 * options.pingInterval + 10)
      expect(session.ping).toBeCalledTimes(2)
      expect(session.pong).toBeCalledTimes(2)

      // clear heartbeat interval
      expect(clearInterval).toBeCalledTimes(1)
      expect(clearInterval.mock.calls[0]).toEqual([
        intervalId
      ])
      clearInterval.mockClear()

      expect(pool.sessions.size).toBe(0)
      expect(session.destroy).toBeCalledTimes(1)
      expect(session.destroy.mock.calls[0]).toEqual([
        expect.objectContaining({
          message: 'pong error'
        }),
        NGHTTP2_CANCEL
      ])
    })
  })
})
