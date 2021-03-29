//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const http2 = require('http2')
const net = require('net')
const { omit } = require('lodash')
const { globalLogger: logger } = require('@gardener-dashboard/logger')
const Semaphore = require('./Semaphore')
const { TimeoutError, isAbortError } = require('./errors')

const {
  NGHTTP2_CANCEL,
  NGHTTP2_INTERNAL_ERROR,
  NGHTTP2_CONNECT_ERROR
} = http2.constants

const kSemaphore = Symbol('semaphore')
const kTimestamp = Symbol('timestamp')
const kTimeoutId = Symbol('timeoutId')
const kIntervalId = Symbol('intervalId')

class SessionPool {
  constructor (id) {
    this.id = id
    this.sessions = new Set()
    this.tlsSession = undefined
    this.queue = []
    this.scalingUp = false
  }

  get options () {
    return this.id.getOptions()
  }

  get pingInterval () {
    return this.options.pingInterval
  }

  get keepAliveTimeout () {
    return this.options.keepAliveTimeout
  }

  get connectTimeout () {
    return this.options.connectTimeout
  }

  get peerMaxConcurrentStreams () {
    return this.options.peerMaxConcurrentStreams
  }

  get value () {
    let value = 0
    for (const { [kSemaphore]: semaphore } of this.sessions) {
      value += semaphore.value
    }
    return value
  }

  destroy () {
    this.tlsSession = undefined
    for (const session of this.sessions) {
      this.deleteSession(session)
    }
  }

  getSession () {
    const sessionList = Array.from(this.sessions)
    let session = sessionList
      // consider free sessions only
      .filter(({ [kSemaphore]: semaphore }) => {
        return semaphore.value > 0
      })
      // session with the highest load first
      .sort(({ [kSemaphore]: a }, { [kSemaphore]: b }) => {
        return a.value - b.value
      })
      .shift()
    if (!session) {
      session = this.createSession()
    }
    return session
  }

  async request (headers, options) {
    const { origin } = this.id
    const session = this.getSession()
    const semaphore = session[kSemaphore]
    const [release, concurrency] = await semaphore.acquire()
    logger.trace('Session %s - stream aquired (%d/%d)', origin, concurrency, semaphore.maxConcurrency)
    const releaseStream = () => {
      release()
      logger.trace('Session %s - stream released (%d/%d)', origin, semaphore.concurrency, semaphore.maxConcurrency)
    }
    clearTimeout(session[kTimeoutId])
    try {
      const stream = session.request(headers, options)
      if (stream.pending) {
        stream.once('ready', () => {
          logger.trace('Session %s - stream %d emitted "ready"', origin, stream.id)
        })
      } else {
        logger.trace('Session %s - stream %d ready', origin, stream.id)
      }
      stream.once('finish', () => {
        logger.trace('Session %s - stream %d emitted "finish"', origin, stream.id)
      })
      stream.once('error', err => {
        if (!isAbortError(err)) {
          logger.error('Session %s - stream %d processing error: %s', origin, stream.id, err.message)
        }
      })
      stream.once('close', () => {
        logger.trace('Session %s - stream %d closed', origin, stream.id)
        releaseStream()
        if (session[kSemaphore].value >= session[kSemaphore].maxConcurrency) {
          this.setSessionTimeout(session)
        }
      })
      const headersPromise = new Promise(resolve => {
        stream.once('response', headers => {
          logger.trace('Session %s - stream %d emitted "response"', origin, stream.id)
          resolve(headers)
        })
      })
      stream.getHeaders = () => headersPromise
      return stream
    } catch (err) {
      logger.error('Session %s - stream creation error: %s', origin, err.message)
      releaseStream()
      throw err
    }
  }

  setSessionTimeout (session) {
    this.clearSessionTimeout(session)
    session[kTimeoutId] = setTimeout(() => session.close(), this.keepAliveTimeout)
  }

  clearSessionTimeout (session) {
    if (session[kTimeoutId]) {
      clearTimeout(session[kTimeoutId])
      session[kTimeoutId] = undefined
    }
  }

  setSessionHeartbeat (session) {
    const { origin } = this.id
    let canceled = false
    const cancel = err => {
      if (!canceled) {
        canceled = true
        logger.debug('Session %s - canceled: %s', origin, err.message)
        this.deleteSession(session, err, NGHTTP2_CANCEL)
      }
    }
    const ping = () => {
      try {
        session.ping(pong)
      } catch (err) {
        logger.error('Session %s - heartbeat error: %s', origin, err.message)
        this.deleteSession(session, err, NGHTTP2_INTERNAL_ERROR)
      }
    }
    const pong = (err, duration) => {
      if (err) {
        cancel(err)
      } else {
        logger.trace('Session %s - ping %d ms', origin, Math.round(duration))
      }
    }
    session[kIntervalId] = setInterval(ping, this.pingInterval)
  }

  clearSessionHeartbeat (session) {
    if (session[kIntervalId]) {
      clearInterval(session[kIntervalId])
      session[kIntervalId] = undefined
    }
  }

  createSession () {
    const { origin, hostname } = this.id
    const options = omit(this.options, ['connectTimeout', 'keepAliveTimeout', 'pingInterval'])
    Object.assign(options, {
      servername: !net.isIP(hostname) ? hostname : '',
      session: this.tlsSession
    })
    const session = http2.connect(origin, options)
    session[kTimestamp] = Date.now()
    session[kSemaphore] = new Semaphore(this.peerMaxConcurrentStreams)
    // add session
    this.sessions.add(session)
    logger.debug('Session %s - pool size is %d (scaled up)', origin, this.sessions.size)
    // get session duration
    const duration = () => Date.now() - session[kTimestamp]
    // tls session can be used for resumption
    session.socket.once('session', session => {
      logger.debug('Session %s - received tls session after %d ms', origin, duration())
      this.tlsSession = session
    })
    // update maxConcurrency of semaphore
    const setMaxConcurrency = settings => {
      const oldValue = session[kSemaphore].maxConcurrency
      const newValue = settings.maxConcurrentStreams
      if (oldValue !== newValue) {
        const change = oldValue < newValue ? 'increased' : 'creased'
        logger.debug('Session %s - maximum concurrency %s to %d', origin, change, newValue)
        session[kSemaphore].maxConcurrency = newValue
      }
    }
    // handle connect timeout
    const timeoutId = setTimeout(() => {
      session.removeAllListeners('connect')
      const err = new TimeoutError(`No session could be aquired within ${this.connectTimeout} ms`)
      this.deleteSession(session, err, NGHTTP2_CONNECT_ERROR)
    }, this.connectTimeout)
    // handle connect error
    session.once('error', err => {
      logger.error('Session %s - connect error: %s', origin, err.message)
      clearTimeout(timeoutId)
      session.removeAllListeners('connect')
      this.deleteSession(session)
      this.tlsSession = undefined
    })
    // handle connect
    session.once('connect', () => {
      logger.debug('Session %s - connected after %d ms', origin, duration())
      clearTimeout(timeoutId)
      session.removeAllListeners('error')
      session.on('error', err => {
        logger.error('Session %s - unexpected error: %s', origin, err.message)
        this.tlsSession = undefined
      })
      session.once('close', () => {
        logger.info('Session %s - closed after %d ms', origin, duration())
        this.deleteSession(session)
      })
      setMaxConcurrency(session.remoteSettings)
      this.setSessionTimeout(session)
      if (this.pingInterval) {
        this.setSessionHeartbeat(session)
      }
    })
    // handle remoteSettings
    session.on('remoteSettings', setMaxConcurrency)
    return session
  }

  deleteSession (session, ...args) {
    const { origin } = this.id
    // stop keep-alive timeout
    this.clearSessionTimeout(session)
    // stop heartbeat interval
    this.clearSessionHeartbeat(session)
    // remove session
    this.sessions.delete(session)
    logger.debug('Session %s - pool size is %d (scaled down)', origin, this.sessions.size)
    // destory session
    session.destroy(...args)
  }
}

module.exports = SessionPool
