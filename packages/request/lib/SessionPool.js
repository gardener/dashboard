//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import http2 from 'http2'
import net from 'net'
import { omit } from 'lodash-es'
import { globalLogger as logger } from '@gardener-dashboard/logger'
import Semaphore from './Semaphore.js'
import { TimeoutError, StreamError, isAbortError } from './errors.js'

const {
  NGHTTP2_CANCEL,
  NGHTTP2_INTERNAL_ERROR,
  NGHTTP2_CONNECT_ERROR,
} = http2.constants

const kSemaphore = Symbol('semaphore')
const kTimeoutId = Symbol('timeoutId')
const kIntervalId = Symbol('intervalId')

function setSemaphore (session, value) {
  session[kSemaphore] = value // eslint-disable-line security/detect-object-injection
}

function setTimeoutId (session, value) {
  session[kTimeoutId] = value // eslint-disable-line security/detect-object-injection
}

function setIntervalId (session, value) {
  session[kIntervalId] = value // eslint-disable-line security/detect-object-injection
}

class Timer {
  #timestamp

  constructor () {
    this.#timestamp = Date.now()
  }

  duration () {
    return Date.now() - this.#timestamp
  }
}

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
    // ensure there are no already destroyed sessions in the pool
    for (const session of this.sessions) {
      if (session.closed || session.destroyed) {
        this.deleteSession(session)
      }
    }
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
    const session = this.getSession()
    const { [kSemaphore]: semaphore } = session
    const [release, concurrency] = await semaphore.acquire()
    logger.trace('Session %s - stream aquired (%d/%d)', this.id, concurrency, semaphore.maxConcurrency)
    const releaseStream = () => {
      release()
      logger.trace('Session %s - stream released (%d/%d)', this.id, semaphore.concurrency, semaphore.maxConcurrency)
    }
    this.clearSessionTimeout(session)
    try {
      const stream = session.request(headers, options)
      if (stream.pending) {
        stream.once('ready', () => {
          logger.trace('Session %s - stream %d emitted "ready"', this.id, stream.id)
        })
      } else {
        logger.trace('Session %s - stream %d ready', this.id, stream.id)
      }
      stream.once('finish', () => {
        logger.trace('Session %s - stream %d emitted "finish"', this.id, stream.id || -1)
      })
      const headersPromise = new Promise((resolve, reject) => {
        let settled = false
        stream.on('error', err => {
          if (!isAbortError(err)) {
            logger.error('Session %s - stream %d processing error: %s', this.id, stream.id || -1, err.message)
          }
          if (!settled) {
            settled = true
            reject(err)
          }
        })
        stream.once('close', () => {
          logger.trace('Session %s - stream %d closed', this.id, stream.id || -1)
          releaseStream()
          const { [kSemaphore]: semaphore } = session
          if (semaphore.value >= semaphore.maxConcurrency) {
            this.setSessionTimeout(session)
          }
          if (!settled) {
            settled = true
            reject(new StreamError('Stream unexpectedly closed'))
          }
        })
        stream.once('response', headers => {
          logger.trace('Session %s - stream %d emitted "response"', this.id, stream.id)
          if (!settled) {
            settled = true
            resolve(headers)
          }
        })
      })
      stream.getHeaders = () => headersPromise
      return stream
    } catch (err) {
      logger.error('Session %s - stream creation error: %s', this.id, err.message)
      releaseStream()
      throw err
    }
  }

  setSessionTimeout (session) {
    this.clearSessionTimeout(session)
    setTimeoutId(session, setTimeout(() => session.close(), this.keepAliveTimeout))
  }

  clearSessionTimeout (session) {
    const { [kTimeoutId]: timeoutId } = session
    if (timeoutId) {
      clearTimeout(timeoutId)
      setTimeoutId(session, undefined)
    }
  }

  setSessionHeartbeat (session) {
    let canceled = false
    const cancel = err => {
      if (!canceled) {
        canceled = true
        logger.debug('Session %s - canceled: %s', this.id, err.message)
        this.deleteSession(session, err, NGHTTP2_CANCEL)
      }
    }
    const ping = () => {
      try {
        session.ping(pong)
      } catch (err) {
        logger.error('Session %s - heartbeat error: %s', this.id, err.message)
        this.deleteSession(session, err, NGHTTP2_INTERNAL_ERROR)
      }
    }
    const pong = (err, duration) => {
      if (err) {
        cancel(err)
      } else {
        logger.trace('Session %s - ping %d ms', this.id, Math.round(duration))
      }
    }
    logger.debug('Session %s - starting heartbeat with %ds ping interval', this.id, Math.floor(this.pingInterval / 1000))
    setIntervalId(session, setInterval(ping, this.pingInterval))
  }

  clearSessionHeartbeat (session) {
    const { [kIntervalId]: intervalId } = session
    if (intervalId) {
      clearInterval(intervalId)
      setIntervalId(session, undefined)
    }
  }

  createSession () {
    const { origin, hostname } = this.id
    const options = omit(this.options, ['connectTimeout', 'keepAliveTimeout', 'pingInterval'])
    Object.assign(options, {
      maxSessionMemory: 20,
      servername: !net.isIP(hostname) ? hostname : '',
      session: this.tlsSession,
    })
    const session = http2.connect(origin, options)
    const timer = new Timer()
    setSemaphore(session, new Semaphore(this.peerMaxConcurrentStreams))
    // add session
    this.sessions.add(session)
    logger.debug('Session %s - pool size is %d (scaled up)', this.id, this.sessions.size)
    // tls session can be used for resumption
    session.socket.once('session', session => {
      logger.debug('Session %s - received tls session after %d ms', this.id, timer.duration())
      this.tlsSession = session
    })
    // update maxConcurrency of semaphore
    const setMaxConcurrency = settings => {
      const { [kSemaphore]: semaphore } = session
      const oldValue = semaphore.maxConcurrency
      const newValue = settings.maxConcurrentStreams
      if (oldValue !== newValue) {
        const change = oldValue < newValue ? 'increased' : 'creased'
        logger.debug('Session %s - maximum concurrency %s to %d', this.id, change, newValue)
        semaphore.maxConcurrency = newValue
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
      logger.error('Session %s - connect error: %s', this.id, err.message)
      clearTimeout(timeoutId)
      session.removeAllListeners('connect')
      this.deleteSession(session)
      this.tlsSession = undefined
    })
    // handle connect
    session.once('connect', () => {
      logger.debug('Session %s - connected after %d ms', this.id, timer.duration())
      clearTimeout(timeoutId)
      session.removeAllListeners('error')
      session.on('error', err => {
        logger.error('Session %s - unexpected error: %s', this.id, err.message)
        this.tlsSession = undefined
      })
      session.once('close', () => {
        logger.info('Session %s - closed after %d ms', this.id, timer.duration())
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
    // stop keep-alive timeout
    this.clearSessionTimeout(session)
    // stop heartbeat interval
    this.clearSessionHeartbeat(session)
    // remove session
    this.sessions.delete(session)
    logger.debug('Session %s - pool size is %d (scaled down)', this.id, this.sessions.size)
    // destory session
    session.destroy(...args)
  }
}

export default SessionPool
