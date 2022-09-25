//
// SPDX-FileCopyrightText: 2022 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { io, Manager } from 'socket.io-client'

function createSocket (store, userManager, logger) {
  const socket = io({
    path: '/api/events',
    transports: ['websocket'],
    autoConnect: false
  })

  // handle manager events
  const manager = socket.io
  manager.open = function (fn) {
    logger.debug('manager opening')
    store.commit('socket/SET_READY_STATE', 'opening')
    userManager.ensureValidToken().finally(() => Manager.prototype.open.call(manager, fn))
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
  socket.on('connect', () => {
    logger.info('socket connected')
    store.dispatch('socket/onConnect', [socket])
    store.dispatch('shoots/synchronize')
  })

  socket.on('disconnect', reason => {
    switch (reason) {
      case 'io server disconnect': {
        logger.debug('socket was forcefully disconnected by the server')
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

  socket.on('connect_error', err => {
    if (socket.active) {
      logger.error('manager error: %s', err.message)
    } else {
      const { statusCode = 500, code } = err.data ?? {}
      logger.error('socket connect error: %s (%d %s)', err.message, statusCode, code)
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

    const handleReceive = () => {
      if (socket.connected) {
        emitSubscribe()
      }
    }

    const emitSubscribe = () => {
      const options = store.getters['shoots/subscription']
      socket.emit('subscribe', 'shoots', options, ({ statusCode, message }) => {
        if (statusCode === 200) {
          logger.debug('subscribed shoots')
        } else {
          logger.debug('failed to subscribe shoots: %s', message)
        }
      })
    }

    const emitUnsubscribe = () => {
      socket.emit('unsubscribe', 'shoots', ({ statusCode, message }) => {
        if (statusCode === 200) {
          logger.debug('unsubscribed shoots')
        } else {
          logger.debug('failed to unsubscribe shoots: %s', message)
        }
      })
    }

    const reconnect = () => userManager.ensureValidToken().finally(() => socket.connect())
    const randomize = (d, f = 0.5) => d + Math.floor(d * f * (2 * Math.random() - 1))

    const handleReconnectAttempt = () => {
      const attempt = store.state.socket.reconnectAttempt
      if (attempt > 0) {
        const delay = attempt < 5
          ? attempt * 1000
          : 5000
        setTimeout(reconnect, randomize(delay, 0.25))
      }
    }

    store.subscribe((mutation) => {
      switch (mutation.type) {
        case 'SET_USER': {
          handleSetUser(mutation.payload)
          break
        }
        case 'shoots/RECEIVE': {
          handleReceive()
          break
        }
        case 'shoots/UNSET_SUBSCRIPTION': {
          emitUnsubscribe()
          break
        }
        case 'socket/RECONNECT_ATTEMPT': {
          handleReconnectAttempt()
          break
        }
      }
    })
  }
}
