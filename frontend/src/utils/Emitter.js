//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import io from 'socket.io-client'
import forEach from 'lodash/forEach'
import isEqual from 'lodash/isEqual'
import concat from 'lodash/concat'
import reduce from 'lodash/reduce'
import EventEmitter from 'events'
import ThrottledNamespacedEventEmitter from './ThrottledEmitter'

class Connector {
  constructor (socket, store) {
    this.socket = socket
    this.store = store
    this.handlers = []
  }

  addHandler (handler) {
    this.handlers.push(handler)
  }

  onConnect (attempt) {
    if (attempt) {
      // eslint-disable-next-line no-console
      console.log(`socket connection ${this.socket.id} established after '${attempt}' attempt(s)`)
    } else {
      // eslint-disable-next-line no-console
      console.log(`socket connection ${this.socket.id} established`)
    }
    this.store.dispatch('unsetWebsocketConnectionError')
    forEach(this.handlers, handler => handler.onConnect())
  }

  onDisconnect (reason) {
    console.error('socket connection lost because', reason)
    this.store.dispatch('setWebsocketConnectionError', { reason })
    forEach(this.handlers, handler => handler.onDisconnect())
  }

  get connected () {
    return this.socket.connected
  }

  disconnect () {
    // eslint-disable-next-line no-console
    console.log(`Disconnect socket ${this.socket.id}`)
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

  async subscribe () {
    if (this.subscribeTo) {
      if (!this.subscribedTo || !isEqual(this.subscribedTo, this.subscribeTo)) {
        if (this.connector.connected) {
          if (await this._subscribe()) {
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

    this.socket.on('namespacedEvents', ({ kind, namespaces }) => {
      if (kind === 'shoots') {
        throttledNsEventEmitter.emit(kind, namespaces)
      }
    })
    this.socket.on('batchNamespacedEventsDone', ({ kind, namespaces }) => {
      if (kind === 'shoots') {
        this.store.dispatch('unsetShootsLoading', namespaces)
        throttledNsEventEmitter.flush()
      }
    })
  }

  async subscribeShoots ({ namespace, filter }) {
    // immediately clear, also if not authenticated to avoid outdated content is shown to the user
    await this.store.dispatch('clearShoots')
    this.subscribeOnNextTrigger({ namespace, filter })
    this.subscribe()
  }

  async _subscribe () {
    const { namespace, filter } = this.subscribeTo

    await this.store.dispatch('setShootsLoading')
    if (namespace === '_all') {
      this.socket.emit('subscribeAllShoots', { filter })
    } else if (namespace) {
      this.socket.emit('subscribeShoots', { namespaces: [{ namespace, filter }] })
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

    this.socket.on('namespacedEvents', ({ kind, namespaces }) => {
      if (kind === 'shoot') {
        this.emit(kind, namespaces)
      }
    })
  }

  subscribeShoot ({ name, namespace }) {
    this.subscribeOnNextTrigger({ name, namespace })
    this.subscribe()
  }

  async _subscribe () {
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

class AbstractTicketsSubscription extends AbstractSubscription {
  constructor (connector) {
    super(connector)

    this.socket.on('events', ({ kind, events }) => {
      this.emit(kind, events)
    })
  }
}

class IssuesSubscription extends AbstractTicketsSubscription {
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

  async _subscribe () {
    await Promise.all([
      this.store.dispatch('clearIssues')
    ])

    this.socket.emit('subscribeIssues')
    return true
  }
}

class CommentsSubscription extends AbstractTicketsSubscription {
  subscribeComments ({ name, namespace }) {
    this.subscribeOnNextTrigger({ name, namespace })
    this.subscribe()
  }

  async _subscribe () {
    await Promise.all([
      this.store.dispatch('clearComments')
    ])

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
  const { socket, store } = connector
  socket.on('connect', attempt => connector.onConnect(attempt))
  socket.on('reconnect', attempt => connector.onConnect(attempt))
  socket.on('disconnect', reason => connector.onDisconnect(reason))
  socket.on('connect_error', err => {
    console.error(`socket connection error ${err}`)
  })
  socket.on('connect_timeout', () => {
    console.error(`socket ${socket.id} connection timeout`)
  })
  socket.on('reconnect_attempt', () => {
    // eslint-disable-next-line no-console
    console.log(`socket ${socket.id} reconnect attempt`)
  })
  socket.on('reconnecting', attempt => {
    store.dispatch('setWebsocketConnectionError', { reconnectAttempt: attempt })
    // eslint-disable-next-line no-console
    console.log(`socket ${socket.id} reconnecting attempt number '${attempt}'`)
  })
  socket.on('reconnect_error', err => {
    console.error(`socket ${socket.id} reconnect error ${err}`)
  })
  socket.on('reconnect_failed', () => {
    console.error(`socket ${socket.id} couldn't reconnect`)
  })
  socket.on('error', err => {
    console.error(`socket ${socket.id} error ${err}`)
  })
  socket.on('subscription_error', error => {
    const { kind, code, message } = error
    console.error(`socket ${socket.id} ${kind} subscription error: ${message} (${code})`)
    store.dispatch('setSubscriptionError', error)
  })
}

export const ioPlugin = store => {
  const shootsConnector = new Connector(io('/shoots', socketConfig), store)
  const ticketsConnector = new Connector(io('/tickets', socketConfig), store)

  const shootsEmitter = new ShootsSubscription(shootsConnector)
  const shootEmitter = new ShootSubscription(shootsConnector)
  // eslint-disable-next-line no-unused-vars
  const ticketIssuesEmitter = new IssuesSubscription(ticketsConnector)
  const ticketCommentsEmitter = new CommentsSubscription(ticketsConnector)

  forEach([shootsConnector, ticketsConnector], initializeConnector)

  const { state, getters } = store

  const handleSetUser = user => {
    if (user) {
      shootsConnector.connect()
      ticketsConnector.connect()
    } else {
      shootsConnector.disconnect()
      ticketsConnector.disconnect()
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

export default {
  plugin: ioPlugin
}
