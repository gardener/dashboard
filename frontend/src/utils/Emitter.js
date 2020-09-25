//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import io from 'socket.io-client'
import forEach from 'lodash/forEach'
import isEqual from 'lodash/isEqual'
import Emitter from 'component-emitter'
import ThrottledNamespacedEventEmitter from './ThrottledEmitter'
import store from '../store'

class Connector {
  constructor (socket) {
    this.socket = socket
    this.handlers = []
  }

  addHandler (handler) {
    this.handlers.push(handler)
  }

  onConnect (attempt) {
    if (attempt) {
      console.log(`socket connection ${this.socket.id} established after '${attempt}' attempt(s)`)
    } else {
      console.log(`socket connection ${this.socket.id} established`)
    }
    store.dispatch('unsetWebsocketConnectionError')
    forEach(this.handlers, handler => handler.onConnect())
  }

  onDisconnect (reason) {
    console.error('socket connection lost because', reason)
    store.dispatch('setWebsocketConnectionError', { reason })
    forEach(this.handlers, handler => handler.onDisconnect())
  }

  get connected () {
    return this.socket.connected
  }

  disconnect () {
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

class AbstractSubscription {
  constructor (connector) {
    connector.addHandler(this)

    this.connector = connector
  }

  get socket () {
    return this.connector.socket
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
        store.dispatch('unsetShootsLoading', namespaces)
        throttledNsEventEmitter.flush()
      }
    })
  }

  async subscribeShoots ({ namespace, filter }) {
    // immediately clear, also if not authenticated to avoid outdated content is shown to the user
    await store.dispatch('clearShoots')
    this.subscribeOnNextTrigger({ namespace, filter })
    this.subscribe()
  }

  async _subscribe () {
    const { namespace, filter } = this.subscribeTo

    await store.dispatch('setShootsLoading')
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
      store.dispatch('subscribeShootAcknowledgement', object)
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
      store.dispatch('clearIssues')
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
      store.dispatch('clearComments')
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

const url = window.location.origin
const socketConfig = {
  path: '/api/events',
  transports: ['websocket'],
  autoConnect: false
}

const shootsConnector = new Connector(io(`${url}/shoots`, socketConfig))
const ticketsConnector = new Connector(io(`${url}/tickets`, socketConfig))

const shootsEmitter = Emitter(new ShootsSubscription(shootsConnector))
const shootEmitter = Emitter(new ShootSubscription(shootsConnector))
const ticketIssuesEmitter = Emitter(new IssuesSubscription(ticketsConnector))
const ticketCommentsEmitter = Emitter(new CommentsSubscription(ticketsConnector))

/* Web Socket Connection */

forEach([shootsConnector, ticketsConnector], connector => {
  const socket = connector.socket
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
    console.log(`socket ${socket.id} reconnect attempt`)
  })
  socket.on('reconnecting', attempt => {
    store.dispatch('setWebsocketConnectionError', { reconnectAttempt: attempt })
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
})

const wrapper = {
  connect (forceful) {
    shootsConnector.connect()
    ticketsConnector.connect()
  },
  disconnect () {
    shootsConnector.disconnect()
    ticketsConnector.disconnect()
  },
  shootsEmitter,
  shootEmitter,
  ticketIssuesEmitter,
  ticketCommentsEmitter
}

export default wrapper
