//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { io, Manager } from 'socket.io-client'
import { constants } from '@/store/shoot/helper'
import { createClockSkewError } from '@/utils/errors'

function createSocket (app) {
  const {
    $logger: logger,
    $authnStore: authnStore,
    $projectStore: projectStore,
    $socketStore: socketStore,
    $shootStore: shootStore,
    $ticketStore: ticketStore,
  } = app.config.globalProperties

  const socket = io({
    path: '/api/events',
    transports: ['websocket'],
    autoConnect: false,
  })

  const manager = socket.io

  const managerOpen = async fn => {
    try {
      await authnStore.ensureValidToken()
    } finally {
      Manager.prototype.open.call(manager, fn)
    }
  }

  // handle manager events
  manager.open = function (fn) {
    logger.debug('manager opening')
    socketStore.setReadyState('opening')
    managerOpen(fn)
  }

  manager.on('open', () => {
    logger.debug('manager open')
    socketStore.setReadyState('open')
  })

  manager.on('close', reason => {
    logger.debug('manager closed: %s', reason)
    socketStore.setReadyState('closed')
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
    } finally {
      socket.connect()
    }
  }

  const reconnect = () => {
    const attempts = socketStore.backoff.attempts
    if (attempts < 10) {
      socketStore.increaseBackoffAttempts()
      const delay = socketStore.backoffDuration
      setTimeout(connect, delay)
    } else {
      logger.error('maximum number of reconnection attempts has been reached')
      socketStore.resetBackoffAttempts()
    }
  }

  socket.on('connect', () => {
    logger.info('socket connected')
    socketStore.onConnect(socket)
    shootStore.synchronize()
  })

  socket.on('disconnect', reason => {
    switch (reason) {
      case 'io server disconnect': {
        logger.debug('socket was forcefully disconnected by the server')
        reconnect()
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
    socketStore.onDisconnect(socket, reason)
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
    socketStore.onError(socket, err)
  })

  // handle custom events
  socket.on('shoots', event => {
    const namespaces = projectStore.currentNamespaces
    if (namespaces.includes(event.object?.metadata.namespace)) {
      shootStore.HANDLE_EVENT(event)
    }
  })

  socket.on('issues', event => {
    ticketStore.handleIssuesEvent(event)
  })

  socket.on('comments', event => {
    ticketStore.handleCommentsEvent(event)
  })

  return socket
}

export default {
  install (app) {
    const {
      $logger: logger,
      $authnStore: authnStore,
      $shootStore: shootStore,
      $socketStore: socketStore,
    } = app.config.globalProperties

    const socket = createSocket(app)

    app.provide('io', app.config.globalProperties.$io = socket.io)

    const handleSetUser = user => {
      if (user) {
        socket.connect()
      } else {
        socket.disconnect()
      }
    }

    const handleSubscribe = options => {
      if (socket.connected) {
        socket.emit('subscribe', 'shoots', options, ({ statusCode, message }) => {
          if (statusCode === 200) {
            logger.debug('subscribed shoots')
            shootStore.setSubscriptionState(constants.OPEN)
          } else {
            const err = new Error(message)
            err.name = 'SubscribeError'
            logger.debug('failed to subscribe shoots: %s', err.message)
            shootStore.setSubscriptionError(err)
          }
        })
      }
    }

    const handleUnsubscribe = () => {
      socket.emit('unsubscribe', 'shoots', ({ statusCode, message }) => {
        if (statusCode === 200) {
          logger.debug('unsubscribed shoots')
          shootStore.setSubscriptionState(constants.CLOSED)
        } else {
          const err = new Error(message)
          err.name = 'UnsubscribeError'
          logger.debug('failed to unsubscribe shoots: %s', err.message)
          shootStore.setSubscriptionError(err)
        }
      })
    }

    const handleConnect = () => {
      if (!socket.connected) {
        socket.connect()
      }
    }

    authnStore.$onAction(({ name, args, after }) => {
      switch (name) {
        case 'SET_USER': {
          after(() => handleSetUser(...args))
          break
        }
      }
    })

    shootStore.$onAction(({ name, args, after }) => {
      switch (name) {
        case 'SUBSCRIBE': {
          after(() => handleSubscribe(...args))
          break
        }
        case 'UNSUBSCRIBE': {
          after(() => handleUnsubscribe())
          break
        }
      }
    })

    socketStore.$onAction(({ name, after }) => {
      switch (name) {
        case 'CONNECT': {
          after(() => handleConnect())
          break
        }
      }
    })
  },
}
