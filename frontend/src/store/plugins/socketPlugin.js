//
// SPDX-FileCopyrightText: 2022 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { io, Manager } from 'socket.io-client'
import { constants } from '@/store/modules/shoots/helper'
import { createClockSkewError } from '@/utils/errors'

function createSocket (store, userManager, logger) {
  const socket = io({
    path: '/api/events',
    transports: ['websocket'],
    autoConnect: false
  })

  const manager = socket.io
  const managerOpen = async fn => {
    try {
      await userManager.ensureValidToken()
    } finally {
      Manager.prototype.open.call(manager, fn)
    }
  }

  // handle manager events
  manager.open = function (fn) {
    logger.debug('manager opening')
    store.commit('socket/SET_READY_STATE', 'opening')
    managerOpen(fn)
  }

  manager.on('open', () => {
    logger.debug('manager open')
    store.commit('socket/SET_READY_STATE', 'open')
  })

  manager.on('close', reason => {
    logger.debug('manager closed: %s', reason)
    store.commit('socket/SET_READY_STATE', 'closed')
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
      await userManager.ensureValidToken()
    } finally {
      socket.connect()
    }
  }
  const reconnect = () => {
    const attempts = store.state.socket.backoff.attempts
    if (attempts < 10) {
      store.commit('socket/BACKOFF_INCREASE_ATTEMPTS')
      const delay = store.getters['socket/backoffDuration']
      setTimeout(connect, delay)
    } else {
      logger.error('maximum number of reconnection attempts has been reached')
      store.commit('socket/BACKOFF_RESET')
    }
  }

  socket.on('connect', () => {
    logger.info('socket connected')
    store.dispatch('socket/onConnect', [socket])
    store.dispatch('shoots/synchronize')
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
    store.dispatch('socket/onDisconnect', [socket, reason])
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
      } = {}
    } = err
    logger.error('socket connect error: %s (%d %s)', message, statusCode, code)
    switch (code) {
      case 'ERR_JWT_TOKEN_REFRESH_REQUIRED': {
        if (typeof data.exp === 'number') {
          const expiresIn = data.exp - Math.floor(Date.now() / 1000)
          const tolerance = 5
          if (expiresIn > tolerance) {
            frameRequestCallback = () => userManager.signout(createClockSkewError())
          }
        }
        break
      }
      case 'ERR_JWT_TOKEN_EXPIRED': {
        frameRequestCallback = () => userManager.signout()
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
    store.dispatch('socket/onError', [socket, err])
  })

  // handle custom events
  socket.on('shoots', event => {
    if (store.getters.currentNamespaces.includes(event.object?.metadata.namespace)) {
      store.commit('shoots/HANDLE_EVENT', {
        rootState: store.state,
        rootGetters: store.getters,
        event
      })
    }
  })

  socket.on('issues', event => {
    store.commit('tickets/HANDLE_ISSUES_EVENT', event)
  })

  socket.on('comments', event => {
    store.commit('tickets/HANDLE_COMMENTS_EVENT', event)
  })

  return socket
}

export default function createPlugin (userManager, logger) {
  return store => {
    const socket = createSocket(store, userManager, logger)

    const handleSetUser = user => {
      if (user) {
        socket.connect()
      } else {
        socket.disconnect()
      }
    }

    const emitSubscribe = options => {
      if (socket.connected) {
        socket.emit('subscribe', 'shoots', options, ({ statusCode, message }) => {
          if (statusCode === 200) {
            logger.debug('subscribed shoots')
            store.commit('shoots/SET_SUBSCRIPTION_STATE', constants.OPEN)
          } else {
            const err = new Error(message)
            err.name = 'SubscribeError'
            logger.debug('failed to subscribe shoots: %s', err.message)
            store.commit('shoots/SET_SUBSCRIPTION_ERROR', err)
          }
        })
      }
    }

    const emitUnsubscribe = () => {
      socket.emit('unsubscribe', 'shoots', ({ statusCode, message }) => {
        if (statusCode === 200) {
          logger.debug('unsubscribed shoots')
          store.commit('shoots/SET_SUBSCRIPTION_STATE', constants.CLOSED)
        } else {
          const err = new Error(message)
          err.name = 'UnsubscribeError'
          logger.debug('failed to unsubscribe shoots: %s', err.message)
          store.commit('shoots/SET_SUBSCRIPTION_ERROR', err)
        }
      })
    }

    store.subscribe((mutation) => {
      switch (mutation.type) {
        case 'SET_USER': {
          handleSetUser(mutation.payload)
          break
        }
        case 'shoots/SUBSCRIBE': {
          emitSubscribe(mutation.payload)
          break
        }
        case 'shoots/UNSUBSCRIBE': {
          emitUnsubscribe()
          break
        }
        case 'socket/CONNECT': {
          if (!socket.connected) {
            socket.connect()
          }
          break
        }
      }
    })
  }
}
