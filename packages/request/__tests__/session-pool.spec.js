//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { vi } from 'vitest'
import EventEmitter from 'events'
import http2 from 'http2'
import crypto from 'crypto'
import SessionId from '../lib/SessionId.js'
import SessionPool from '../lib/SessionPool.js'
import { StreamError } from '../lib/errors.js'
import testUtils from '@gardener-dashboard/test-utils'

const { getOwnSymbolProperty } = testUtils.helper
const {
  NGHTTP2_CANCEL,
  HTTP2_HEADER_STATUS,
} = http2.constants

class MockEmitter {
  constructor () {
    this.emitter = new EventEmitter()
    const impl = key => {
      return (...args) => this.emitter[key](...args)
    }
    const spies = ['on', 'once', 'removeListener', 'removeAllListeners']
    for (const key of spies) {
      this[key] = vi.fn().mockImplementation(impl(key))
    }
    const keys = ['emit']
    for (const key of keys) {
      this[key] = impl(key)
    }
  }
}

class MockTLSSocket extends MockEmitter {
  constructor () {
    super()
    this.bytesRead = 0
  }
}

class MockHttp2Stream extends MockEmitter {}

class MockHttp2Session extends MockEmitter {
  constructor (authority, { peerMaxConcurrentStreams = 100 } = {}) {
    super()
    this.authority = authority
    this.remoteSettings = {
      maxConcurrentStreams: peerMaxConcurrentStreams,
    }
    this.socket = new MockTLSSocket()
    this.destroyed = false
    this.destroy = vi.fn().mockImplementation(() => {
      this.destroyed = true
      this.emit('close')
    })
    this.closed = false
    this.close = vi.fn().mockImplementation(() => {
      this.closed = true
      this.emit('close')
    })
    this.pong = vi.fn()
      .mockReturnValueOnce(7)
      .mockImplementation(() => {
        throw new Error('pong error')
      })
    this.ping = vi.fn()
      .mockImplementation(callback => {
        try {
          callback(null, this.pong())
        } catch (err) {
          callback(err)
        }
      })
    this.request = vi.fn()
      .mockImplementation((...args) => new MockHttp2Stream(...args))
    this.setTimeout = vi.fn()
  }
}

describe('SessionPool', () => {
  const authority = 'https://foo.org'
  const tlsSession = crypto.randomBytes(16)
  let options
  let sid
  let pool
  let mockHttp2Connect
  let requestHeaders
  let responseHeaders

  beforeAll(() => {
    vi.useFakeTimers()
    vi.spyOn(globalThis, 'setTimeout')
    vi.spyOn(globalThis, 'clearTimeout')
  })

  afterAll(() => {
    vi.useRealTimers()
  })

  beforeEach(() => {
    requestHeaders = {}
    responseHeaders = {
      [HTTP2_HEADER_STATUS]: 200,
    }
    options = {
      peerMaxConcurrentStreams: 100,
      maxOutstandingPings: 2,
      keepAliveTimeout: 60000,
      connectTimeout: 15000,
      readIdleTimeout: false,
      pingTimeout: 15000,
    }
    sid = new SessionId(authority, options)
    sid.getOptions = vi.fn().mockReturnValue(options)
    pool = new SessionPool(sid)
    mockHttp2Connect = vi
      .spyOn(http2, 'connect')
      .mockImplementation((...args) => {
        return new MockHttp2Session(...args)
      })
    vi.clearAllMocks()
  })

  describe('#constructor', () => {
    it('should create an agent instance with defaults', () => {
      expect(pool.id).toBe(sid)
      expect(pool.options).toBe(options)
      expect(pool.keepAliveTimeout).toBe(options.keepAliveTimeout)
      expect(pool.connectTimeout).toBe(options.connectTimeout)
      expect(pool.readIdleTimeout).toBe(options.readIdleTimeout)
      expect(pool.pingTimeout).toBe(options.pingTimeout)
      expect(pool.sessions).toBeInstanceOf(Set)
      expect(pool.sessions.size).toBe(0)
      expect(pool.queue).toBeInstanceOf(Array)
      expect(pool.queue.length).toBe(0)
      expect(pool.tlsSession).toBeUndefined()
      expect(pool.value).toBe(0)
    })
  })

  describe('#request', () => {
    const error = new Error('error')

    it('should fail to create a request', async () => {
      const session = pool.getSession()
      session.emit('connect')
      session.request = vi.fn().mockImplementation(() => {
        throw error
      })
      await expect(pool.request()).rejects.toBe(error)
      const semaphore = getOwnSymbolProperty(session, 'semaphore')
      expect(semaphore.concurrency).toBe(0)
    })

    it('should create a request with a successful response', async () => {
      const session = pool.getSession()
      session.emit('connect')
      const stream = await pool.request(requestHeaders)
      stream.emit('response', responseHeaders)
      await expect(stream.getHeaders()).resolves.toBe(responseHeaders)
    })

    it('should create a request with an error', async () => {
      const session = pool.getSession()
      session.emit('connect')
      const stream = await pool.request(requestHeaders)
      stream.emit('error', error)
      await expect(stream.getHeaders()).rejects.toBe(error)
    })

    it('should create a request with an unexpected close', async () => {
      const session = pool.getSession()
      session.emit('connect')
      const stream = await pool.request(requestHeaders)
      stream.emit('close')
      await expect(stream.getHeaders()).rejects.toThrow(StreamError)
    })
  })

  describe('#getSession', () => {
    it('should return a new session', () => {
      pool.createSession = vi.fn()
      pool.getSession()
      expect(pool.createSession).toHaveBeenCalledTimes(1)
    })

    it('should return an existing session', () => {
      const session = pool.getSession()
      session.emit('connect')
      expect(pool.getSession()).toBe(session)
    })

    it('should delete an existing destroyed sessions and return a new one', () => {
      const session = pool.getSession()
      session.emit('connect')
      expect(pool.getSession()).toBe(session)
      session.destroyed = true
      pool.createSession = vi.fn()
      pool.getSession()
      expect(pool.createSession).toHaveBeenCalledTimes(1)
    })

    it('should return the session with the highest load', async () => {
      options.peerMaxConcurrentStreams = 2
      const session = pool.getSession()
      session.emit('connect')
      const firstStream = await pool.request(requestHeaders)
      firstStream.emit('response', responseHeaders)
      const secondStream = await pool.request(requestHeaders)
      secondStream.emit('response', responseHeaders)
      expect(pool.getSession()).not.toBe(session)
      firstStream.emit('close')
      expect(pool.getSession()).toBe(session)
      secondStream.emit('close')
      vi.runAllTimers()
      expect(pool.sessions.size).toBe(0)
    })
  })

  describe('#createSession', () => {
    it('should create and close a session', () => {
      const session = pool.createSession()

      // create http2 session
      expect(mockHttp2Connect).toHaveBeenCalledTimes(1)
      expect(mockHttp2Connect.mock.calls[0]).toEqual([
        sid.origin,
        expect.objectContaining({
          peerMaxConcurrentStreams: options.peerMaxConcurrentStreams,
          maxOutstandingPings: options.maxOutstandingPings,
          servername: sid.hostname,
        }),
      ])
      expect(mockHttp2Connect.mock.results[0].value).toBe(session)
      const socket = session.socket
      const semaphore = getOwnSymbolProperty(session, 'semaphore')
      const setMaxConcurrencySpy = vi.spyOn(semaphore, 'maxConcurrency', 'set')

      // connect timeout
      expect(setTimeout).toHaveBeenCalledTimes(1)
      expect(setTimeout.mock.calls[0]).toEqual([
        expect.any(Function), options.connectTimeout,
      ])
      const connectTimeoutId = setTimeout.mock.results[0].value
      setTimeout.mockClear()

      // listening once 'session' event
      expect(socket.once).toHaveBeenCalledTimes(1)
      expect(socket.once.mock.calls[0]).toEqual([
        'session', expect.any(Function),
      ])
      socket.emit('session', tlsSession)
      expect(pool.tlsSession).toBe(tlsSession)
      socket.once.mockClear()

      // listening on the 'error' and 'connect' event
      expect(session.once).toHaveBeenCalledTimes(2)
      expect(session.once.mock.calls).toEqual([
        ['error', expect.any(Function)],
        ['connect', expect.any(Function)],
      ])
      session.once.mockClear()

      // connect session
      session.emit('connect')

      // remove all listener
      expect(session.removeAllListeners).toHaveBeenCalledTimes(1)
      expect(session.removeAllListeners.mock.calls[0]).toEqual([
        'error',
      ])
      session.removeAllListeners.mockClear()

      // clear connect timeout
      expect(clearTimeout).toHaveBeenCalledTimes(1)
      expect(clearTimeout.mock.calls[0]).toEqual([
        connectTimeoutId,
      ])
      clearTimeout.mockClear()

      // listening on 'remoteSettings' and 'error' events
      expect(session.on).toHaveBeenCalledTimes(2)
      expect(session.on.mock.calls).toEqual([
        ['remoteSettings', expect.any(Function)],
        ['error', expect.any(Function)],
      ])
      session.on.mockClear()

      // listening on the 'close' event
      expect(session.once).toHaveBeenCalledTimes(1)
      expect(session.once.mock.calls).toEqual([
        ['close', expect.any(Function)],
      ])
      session.once.mockClear()

      // keep-alive timeout
      expect(setTimeout).toHaveBeenCalledTimes(1)
      expect(setTimeout.mock.calls[0]).toEqual([
        expect.any(Function), options.keepAliveTimeout,
      ])
      const keepAliveTimeoutId = setTimeout.mock.results[0].value
      setTimeout.mockClear()

      // session added
      expect(pool.sessions.size).toBe(1)
      expect(pool.value).toBe(semaphore.value)

      // receive remote settings
      session.remoteSettings.maxConcurrentStreams = 250
      session.emit('remoteSettings', session.remoteSettings)

      // second update of maxConcurrency
      expect(setMaxConcurrencySpy).toHaveBeenCalledTimes(1)
      expect(setMaxConcurrencySpy.mock.calls[0]).toEqual([
        session.remoteSettings.maxConcurrentStreams,
      ])

      // close session
      session.emit('close')

      // session deleted
      expect(pool.sessions.size).toBe(0)

      // clear keep-alive timeout
      expect(clearTimeout).toHaveBeenCalledTimes(1)
      expect(clearTimeout.mock.calls[0]).toEqual([
        keepAliveTimeoutId,
      ])
      clearTimeout.mockClear()

      // session destroyed
      expect(session.destroy).toHaveBeenCalledTimes(1)
      expect(session.destroy.mock.calls[0]).toEqual([])
    })
  })

  describe('#setSessionHeartbeat', () => {
    beforeEach(() => {
      options.readIdleTimeout = 100
      options.pingTimeout = 50
    })

    it('should rearm the heartbeat when bytes have been read', () => {
      const session = new MockHttp2Session()
      pool.sessions.add(session)
      pool.setSessionHeartbeat(session)

      session.socket.bytesRead = 42
      vi.advanceTimersByTime(options.readIdleTimeout)

      expect(session.ping).not.toHaveBeenCalled()
      expect(pool.sessions.size).toBe(1)

      pool.clearSessionHeartbeat(session)
      expect(clearTimeout).toHaveBeenCalled()
    })

    it('should cancel the session when a ping times out', () => {
      const session = new MockHttp2Session()
      session.ping.mockImplementation(() => {})
      pool.sessions.add(session)
      pool.setSessionHeartbeat(session)

      vi.advanceTimersByTime(options.readIdleTimeout)
      expect(session.ping).toHaveBeenCalledTimes(1)

      vi.advanceTimersByTime(options.pingTimeout)
      expect(pool.sessions.size).toBe(0)
      expect(session.destroy).toHaveBeenCalledTimes(1)
      expect(session.destroy.mock.calls[0]).toEqual([
        expect.objectContaining({
          code: 'ETIMEDOUT',
          message: `PING not answered within ${options.pingTimeout} ms`,
        }),
        NGHTTP2_CANCEL,
      ])
    })

    it('should rearm the heartbeat after a successful ping', () => {
      const session = new MockHttp2Session()
      pool.sessions.add(session)
      pool.setSessionHeartbeat(session)

      vi.advanceTimersByTime(2 * options.readIdleTimeout)
      expect(session.ping).toHaveBeenCalledTimes(2)
      expect(session.pong).toHaveBeenCalledTimes(2)

      expect(pool.sessions.size).toBe(0)
      expect(session.destroy).toHaveBeenCalledTimes(1)
      expect(session.destroy.mock.calls[0]).toEqual([
        expect.objectContaining({
          message: 'pong error',
        }),
        NGHTTP2_CANCEL,
      ])
    })
  })

  describe('#deleteSession', () => {
    // When deleteSession() is invoked imperatively (e.g. error path), the
    // 'close' listener registered in createSession() can still fire later.
    // The late delete must not emit another "(scaled down)" log for the
    // current pool size.
    it('should ignore a late close after imperative delete', () => {
      const session = pool.getSession()
      session.emit('connect')
      session.destroy.mockImplementation(() => {
        session.destroyed = true
      })
      expect(pool.sessions.size).toBe(1)

      // Imperative delete (simulates error-path branch).
      pool.deleteSession(session)
      expect(pool.sessions.size).toBe(0)
      expect(session.destroy).toHaveBeenCalledTimes(1)

      // A second, unrelated session enters the pool.
      const otherSession = pool.getSession()
      otherSession.emit('connect')
      expect(pool.sessions.size).toBe(1)

      // Late 'close' from the first session must be tolerated.
      session.emit('close')

      expect(pool.sessions.size).toBe(1)
      expect(pool.sessions.has(otherSession)).toBe(true)
      expect(otherSession.destroy).not.toHaveBeenCalled()
      expect(session.destroy).toHaveBeenCalledTimes(1)
    })
  })
})
