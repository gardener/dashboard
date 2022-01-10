//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import io from 'socket.io-client'
import get from 'lodash/get'
import forEach from 'lodash/forEach'
import isEqual from 'lodash/isEqual'
import concat from 'lodash/concat'
import reduce from 'lodash/reduce'
import EventEmitter from 'events'
import ThrottledNamespacedEventEmitter from './ThrottledEmitter'

class Connector {
  constructor (socket, store, userManager) {
    this.socket = socket
    this.store = store
    this.handlers = []
    this.userManager = userManager
  }

  addHandler (handler) {
    this.handlers.push(handler)
  }

  onConnect (attempt) {
    if (attempt) {
      // eslint-disable-next-line no-console
      console.log('socket connection %s established after %d attempt(s)', this.socket.id, attempt)
    } else {
      // eslint-disable-next-line no-console
      console.log('socket connection %s established', this.socket.id)
    }
    this.store.dispatch('unsetWebsocketConnectionError')
    forEach(this.handlers, handler => handler.onConnect())
  }

  onDisconnect (reason) {
    console.error('socket connection lost because %s', reason)
    this.store.dispatch('setWebsocketConnectionError', { reason })
    forEach(this.handlers, handler => handler.onDisconnect())
  }

  get connected () {
    return this.socket.connected
  }

  disconnect () {
    // eslint-disable-next-line no-console
    console.log('disconnect socket %s', this.socket.id)
    if (this.socket.connected) {
      this.socket.disconnect()
    }
  }

  connect () {
    if (!this.socket.connected) {
      this.socket.connect()
    }
  }
}

class AbstractSubscription extends EventEmitter {
  constructor (connector) {
    super()
    connector.addHandler(this)

    this.connector = connector
  }

  get socket () {
    return this.connector.socket
  }

  get store () {
    return this.connector.store
  }

  onConnect () {
    if (this.subscribeTo) {
      this.subscribe()
    }
  }

  onDisconnect () {
    this.subscribeOnNextTrigger()
  }

  subscribe () {
    if (this.subscribeTo) {
      if (!this.subscribedTo || !isEqual(this.subscribedTo, this.subscribeTo)) {
        if (this.connector.connected) {
          if (this._subscribe()) {
            this.subscribed()
          }
        } else {
          this.subscribeOnNextTrigger()
        }
      }
    } else {
      if (!this.subscribedTo) {
        console.error(new Error('subscribe called without subscribing to anything'))
      }
    }
  }

  unsubscribe () {
    this.subscribeTo = undefined
    if (this.connector.connected) {
      if (this.subscribedTo) {
        if (this._unsubscribe()) {
          this.subscribedTo = undefined
        }
      }
    } else {
      // not connected or connection lost -> no need to unsubscribe
      this.subscribedTo = undefined
    }
  }

  // eslint-disable-next-line
  _unsubscribe () {
    // default implementation
    return true
  }

  subscribed () {
    this.subscribedTo = this.subscribeTo
    this.subscribeTo = undefined
  }

  /*
  * subscribeOnNextTrigger: trigger could be onConnect or by calling subscribe
  */
  subscribeOnNextTrigger (subscription = this.subscribeTo || this.subscribedTo) {
    if (!subscription) {
      return
    }
    this.subscribeTo = subscription
    this.subscribedTo = undefined
  }
}

class ShootsSubscription extends AbstractSubscription {
  constructor (connector) {
    super(connector)

    /* currently we only throttle NamespacedEvents (for shoots) as for this kind
    * we expect many events coming in in a short period of time */
    const throttledNsEventEmitter = new ThrottledNamespacedEventEmitter({ emitter: this, wait: 1000 })

    this.socket.on('shoots', ({ kind, namespaces }) => {
      if (kind === 'shoots') {
        throttledNsEventEmitter.emit(kind, namespaces)
      }
    })
    this.socket.on('subscription_done', ({ kind, namespace }) => {
      if (kind === 'shoots' && namespace === this.store.state.namespace) {
        this.store.commit('SET_SHOOTS_LOADING', false)
        throttledNsEventEmitter.flush()
      }
    })
  }

  subscribeShoots ({ namespace, filter }) {
    // immediately clear, also if not authenticated to avoid outdated content is shown to the user
    this.store.commit('shoots/CLEAR_ALL')
    this.subscribeOnNextTrigger({ namespace, filter })
    this.subscribe()
  }

  _subscribe () {
    const { namespace, filter } = this.subscribeTo

    this.store.commit('SET_SHOOTS_LOADING', true)
    if (namespace === '_all') {
      this.socket.emit('subscribeAllShoots', { filter })
    } else if (namespace) {
      this.socket.emit('subscribeShoots', { namespace, filter })
    } else {
      console.error(new Error('no namespace specified'))
      return false
    }
    return true
  }
}

class ShootSubscription extends AbstractSubscription {
  constructor (connector) {
    super(connector)

    this.socket.on('shoots', ({ kind, namespaces }) => {
      if (kind === 'shoot') {
        this.emit(kind, namespaces)
      }
    })
  }

  subscribeShoot ({ name, namespace }) {
    this.subscribeOnNextTrigger({ name, namespace })
    this.subscribe()
  }

  _subscribe () {
    const { namespace, name } = this.subscribeTo
    // TODO clear shoot from store?
    this.socket.emit('subscribeShoot', { namespace, name }, object => {
      this.store.dispatch('subscribeShootAcknowledgement', object)
    })
    return true
  }

  _unsubscribe () {
    this.socket.emit('unsubscribeShoot')
    return true
  }
}

class IssuesSubscription extends AbstractSubscription {
  constructor (connector) {
    super(connector)

    this.socket.on('issues', ({ kind, events }) => {
      this.emit(kind, events)
    })
  }

  onConnect () {
    super.onConnect()

    if (!this.subscribedTo) {
      this.subscribeIssues()
    }
  }

  subscribeIssues () {
    this.subscribeOnNextTrigger({}) // no need to pass any parameter, except an empty object; could be improved
    this.subscribe()
  }

  _subscribe () {
    this.store.commit('tickets/CLEAR_ISSUES')

    this.socket.emit('subscribeIssues')
    return true
  }
}

class CommentsSubscription extends AbstractSubscription {
  constructor (connector) {
    super(connector)

    this.socket.on('comments', ({ kind, events }) => {
      this.emit(kind, events)
    })
  }

  subscribeComments ({ name, namespace }) {
    this.subscribeOnNextTrigger({ name, namespace })
    this.subscribe()
  }

  _subscribe () {
    this.store.commit('tickets/CLEAR_COMMENTS')

    const { name, namespace } = this.subscribeTo
    this.socket.emit('subscribeComments', { name, namespace })
    return true
  }

  _unsubscribe () {
    this.socket.emit('unsubscribeComments')
    return true
  }
}

const socketConfig = {
  path: '/api/events',
  transports: ['websocket'],
  autoConnect: false
}

/* Web Socket Connection */
function initializeConnector (connector) {
  const { socket, store, userManager } = connector
  socket.on('connect', attempt => connector.onConnect(attempt))
  socket.on('reconnect', attempt => connector.onConnect(attempt))
  socket.on('disconnect', reason => connector.onDisconnect(reason))
  socket.on('connect_error', err => {
    console.error('socket connection error: %s', err)
    const statusCode = get(err, 'data.statusCode')
    if ([401, 403].includes(statusCode)) {
      userManager.signout(err)
    }
  })
  socket.on('connect_timeout', () => {
    console.error('socket %s connection timeout', socket.id)
  })
  socket.on('reconnect_attempt', () => {
    // eslint-disable-next-line no-console
    console.log('socket %s reconnect attempt', socket.id)
  })
  socket.on('reconnecting', attempt => {
    store.dispatch('setWebsocketConnectionError', { reconnectAttempt: attempt })
    // eslint-disable-next-line no-console
    console.log('socket %s reconnecting attempt number %d', socket.id, attempt)
  })
  socket.on('reconnect_error', err => {
    console.error('socket %s reconnect error: %s', socket.id, err)
  })
  socket.on('reconnect_failed', () => {
    console.error('socket %s reconnect failed', socket.id)
  })
  socket.on('error', err => {
    console.error('socket %s error: %s', socket.id, err)
  })
  socket.on('subscription_error', err => {
    const { kind, code, message } = err
    console.error('socket %s %s subscription error: %s (%s)', socket.id, kind, message, code)
    store.dispatch('setError', err)
  })
}

export function createIoPlugin (userManager) {
  return store => {
    const socket = io(socketConfig)
    const connector = new Connector(socket, store, userManager)
    const shootsEmitter = new ShootsSubscription(connector)
    const shootEmitter = new ShootSubscription(connector)
    // eslint-disable-next-line no-unused-vars
    const ticketIssuesEmitter = new IssuesSubscription(connector)
    const ticketCommentsEmitter = new CommentsSubscription(connector)

    initializeConnector(connector)

    const { state, getters } = store

    const handleSetUser = user => {
      if (user) {
        connector.connect()
      } else {
        connector.disconnect()
      }
    }

    const handleSubscribe = ([key, value] = []) => {
      try {
        switch (key) {
          case 'shoot':
            shootEmitter.subscribeShoot(value)
            break
          case 'shoots':
            shootsEmitter.subscribeShoots(value)
            break
          case 'comments':
            ticketCommentsEmitter.subscribeComments(value)
            break
        }
      } catch (err) { /* ignore error */ }
    }

    const handleUnsubscribe = key => {
      try {
        switch (key) {
          case 'comments':
            ticketCommentsEmitter.unsubscribe()
            break
        }
      } catch (err) { /* ignore error */ }
    }

    store.subscribe(mutation => {
      const { type, payload } = mutation
      switch (type) {
        case 'SET_USER':
          handleSetUser(payload)
          break
        case 'SUBSCRIBE':
          handleSubscribe(payload)
          break
        case 'UNSUBSCRIBE':
          handleUnsubscribe(payload)
          break
      }
    })

    const filterNamespacedEvents = namespacedEvents => {
      const concatEventsForNamespace = (accumulator, namespace) => concat(accumulator, namespacedEvents[namespace] || [])
      return reduce(getters.currentNamespaces, concatEventsForNamespace, [])
    }

    /* handle 'shoots' events */
    shootsEmitter.on('shoots', namespacedEvents => {
      store.commit('shoots/HANDLE_EVENTS', {
        rootState: state,
        rootGetters: getters,
        events: filterNamespacedEvents(namespacedEvents)
      })
    })

    /* handle 'shoot' events */
    shootEmitter.on('shoot', namespacedEvents => {
      store.commit('shoots/HANDLE_EVENTS', {
        rootState: state,
        rootGetters: getters,
        events: filterNamespacedEvents(namespacedEvents)
      })
    })

    /* handle 'issues' events */
    ticketIssuesEmitter.on('issues', events => {
      store.commit('tickets/HANDLE_ISSUE_EVENTS', events)
    })

    /* handle 'comments' events */
    ticketCommentsEmitter.on('comments', events => {
      store.commit('tickets/HANDLE_COMMENTS_EVENTS', events)
    })
  }
}
