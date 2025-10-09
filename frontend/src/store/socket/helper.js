//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//
import { unref } from 'vue'
import {
  io,
  Manager,
} from 'socket.io-client'

import { createClockSkewError } from '@/utils/errors'

export function createSocket (state, context) {
  const {
    logger,
    authnStore,
    shootStore,
    ticketStore,
    projectStore,
    seedStore,
  } = context

  const socket = io({
    path: '/api/events',
    transports: ['websocket'],
    autoConnect: false,
  })

  const manager = socket.io

  const managerOpen = async fn => {
    try {
      await authnStore.ensureValidToken()
    } catch (err) {
      logger.info('io token invalid: %s - %s', err.name, err.message)
    } finally {
      Manager.prototype.open.call(manager, fn)
    }
  }

  // handle manager events
  manager.open = function (fn) {
    logger.debug('manager opening')
    state.readyState = 'opening'
    managerOpen(fn)
  }

  manager.on('open', () => {
    logger.debug('manager open')
    state.readyState = 'open'
  })

  manager.on('close', reason => {
    logger.debug('manager closed: %s', reason)
    state.readyState = 'closed'
  })

  manager.on('error', err => {
    logger.error('manager error: %s - %s', err.name, err)
  })

  manager.on('reconnect', attempt => {
    logger.debug('manager reconnect attempt %d succeeded', attempt)
  })

  manager.on('reconnect_attempt', attempt => {
    logger.debug('io reconnect attempt number %d', attempt)
  })

  manager.on('reconnect_error', err => {
    logger.error('io reconnect error: %s - %s', err.name, err.message)
  })

  manager.on('reconnect_failed', () => {
    logger.error('io reconnect finally failed')
  })

  // handle socket event
  const connect = async () => {
    try {
      await authnStore.ensureValidToken()
    } catch (err) {
      logger.info('io token invalid: %s - %s', err.name, err.message)
    } finally {
      socket.connect()
    }
  }

  const reconnect = () => {
    if (state.backoff.attempts < 10) {
      state.backoff.attempts += 1
      const delay = getBackoffDuration(state.backoff)
      setTimeout(connect, delay)
    } else {
      logger.error('maximum number of reconnection attempts has been reached')
      state.backoff.attempts = 0
    }
  }

  const setConnected = value => {
    state.connected = value
    if (value) {
      state.reason = null
      state.error = null
      state.backoff.attempts = 0
    }
  }

  socket.on('connect', () => {
    logger.info('socket connected')
    state.id = socket.id
    state.active = socket.active
    setConnected(socket.connected)
    shootStore.synchronize()
  })

  socket.on('disconnect', reason => {
    const isSessionExpired = authnStore.isExpired()

    switch (reason) {
      case 'io server disconnect': {
        logger.debug('socket was forcefully disconnected by the server')
        /**
         * Reconnect if the server forces a disconnect to refresh the token,
         * unless the session's absolute lifetime has expired.
         */
        if (!isSessionExpired) {
          reconnect()
        }
        break
      }
      case 'io client disconnect': {
        logger.debug('socket was manually disconnected by the client')
        break
      }
      default: {
        logger.debug('socket disconnected: %s', reason)
        break
      }
    }

    state.active = socket.active
    setConnected(socket.connected)
    state.reason = reason

    // If the session is expired, sign the user out and redirect to login
    if (isSessionExpired) {
      authnStore.signout()
    }
  })

  const handleManagerError = err => {
    logger.error('manager error: %s', err.message)
  }

  const handleMiddlewareError = err => {
    let frameRequestCallback
    const {
      message,
      data: {
        statusCode = 500,
        code = 'ERR_SOCKET_MIDDLEWARE',
        ...data
      } = {},
    } = err
    logger.error('socket connect error: %s (%d %s)', message, statusCode, code)
    switch (code) {
      case 'ERR_JWT_TOKEN_REFRESH_REQUIRED': {
        if (typeof data.exp === 'number') {
          const expiresIn = data.exp - Math.floor(Date.now() / 1000)
          const tolerance = 5
          if (expiresIn > tolerance) {
            frameRequestCallback = () => authnStore.signout(createClockSkewError())
          }
        }
        break
      }
      case 'ERR_JWT_TOKEN_EXPIRED': {
        frameRequestCallback = () => authnStore.signout()
        break
      }
    }
    if (frameRequestCallback) {
      window.requestAnimationFrame(frameRequestCallback)
    } else {
      reconnect()
    }
  }

  socket.on('connect_error', err => {
    if (socket.active) {
      handleManagerError(err)
    } else {
      handleMiddlewareError(err)
    }
    state.active = socket.active
    setConnected(socket.connected)
    state.error = err
  })

  // handle custom events
  socket.on('shoots', event => {
    shootStore.handleEvent(event)
  })

  socket.on('issues', event => {
    ticketStore.handleIssuesEvent(event)
  })

  socket.on('comments', event => {
    ticketStore.handleCommentsEvent(event)
  })

  socket.on('projects', event => {
    projectStore.handleEvent(event)
  })

  socket.on('seeds', event => {
    seedStore.handleEvent(event)
  })

  return socket
}

export function getBackoffDuration (backoff) {
  const { min, max, factor, jitter, attempts } = unref(backoff)
  const duration = min * Math.pow(factor, attempts)
  const rand = Math.random()
  const sign = Math.sign(rand - 0.5)
  const deviation = Math.floor(rand * jitter * duration)
  return Math.min(duration + sign * deviation, max)
}
