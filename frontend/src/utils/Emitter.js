//
// Copyright (c) 2019 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
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
    console.error(`socket connection lost because`, reason)
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

  connect (forceful) {
    if (!this.socket.connected) {
      this.socket.connect()
    } else if (forceful === true) {
      console.log(`Forcefully reconnecting Socket ${this.socket.id}`)
      const onDisconnect = reason => {
        console.log('onDisconnect', reason)
        if (reason === 'io client disconnect') {
          clearTimeout(timeoutId)
          this.socket.connect()
        }
      }
      const onTimeout = () => {
        this.socket.off('disconnect', onDisconnect)
      }
      const timeoutId = setTimeout(onTimeout, 1000)
      this.socket.once('disconnect', onDisconnect)
      this.socket.disconnect()
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

    /* currently we only throttle NamespacedEvents (for shoots) as for this kind
    * we expect many events coming in in a short period of time */
    const throttledNsEventEmitter = new ThrottledNamespacedEventEmitter({ emitter: this, wait: 1000 })

    this.socket.on('namespacedEvents', ({ kind, namespaces }) => {
      if (kind === 'shoot') {
        throttledNsEventEmitter.emit(kind, namespaces)
      }
    })
    this.socket.on('shootSubscriptionDone', ({ kind, target }) => {
      const { name, namespace } = target
      throttledNsEventEmitter.flush()
      store.dispatch('getShootInfo', { name, namespace })
    })
  }

  subscribeShoot ({ name, namespace }) {
    this.subscribeOnNextTrigger({ name, namespace })
    this.subscribe()
  }

  async _subscribe () {
    const { namespace, name } = this.subscribeTo
    // TODO clear shoot from store?

    this.socket.emit('subscribeShoot', { namespace, name })
    return true
  }

  _unsubscribe () {
    this.socket.emit('unsubscribeShoot')
    return true
  }
}

class AbstractJournalsSubscription extends AbstractSubscription {
  constructor (connector) {
    super(connector)

    this.socket.on('events', ({ kind, events }) => {
      this.emit(kind, events)
    })
  }

  connect (forceful) {
    if (store.getters.isAdmin) {
      super.connect(forceful)
    }
  }
}

class IssuesSubscription extends AbstractJournalsSubscription {
  onConnect () {
    super.onConnect()

    if (store.getters.isAdmin && !this.subscribedTo) {
      this.subscribeIssues()
    }
  }

  subscribeIssues () {
    if (store.getters.isAdmin) {
      this.subscribeOnNextTrigger({}) // no need to pass any parameter, except an empty object; could be improved
      this.subscribe()
    }
  }

  async _subscribe () {
    if (store.getters.isAdmin) {
      await Promise.all([
        store.dispatch('clearIssues')
      ])

      this.socket.emit('subscribeIssues')
      return true
    }
    return false
  }
}

class CommentsSubscription extends AbstractJournalsSubscription {
  subscribeComments ({ name, namespace }) {
    this.subscribeOnNextTrigger({ name, namespace })
    this.subscribe()
  }

  async _subscribe () {
    if (store.getters.isAdmin) {
      await Promise.all([
        store.dispatch('clearComments')
      ])

      const { name, namespace } = this.subscribeTo
      this.socket.emit('subscribeComments', { name, namespace })
      return true
    }
    return false
  }

  _unsubscribe () {
    if (store.getters.isAdmin) {
      this.socket.emit('unsubscribeComments')
      return true
    }
    return false
  }
}

const url = window.location.origin
const socketConfig = {
  path: '/api/events',
  transports: ['websocket'],
  autoConnect: false
}

const shootsConnector = new Connector(io(`${url}/shoots`, socketConfig))
const journalsConnector = new Connector(io(`${url}/journals`, socketConfig))

const shootsEmitter = Emitter(new ShootsSubscription(shootsConnector))
const shootEmitter = Emitter(new ShootSubscription(shootsConnector))
const journalIssuesEmitter = Emitter(new IssuesSubscription(journalsConnector))
const journalCommentsEmitter = Emitter(new CommentsSubscription(journalsConnector))

const connectors = [shootsConnector, journalsConnector]

/* Web Socket Connection */

forEach(connectors, connector => {
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
    store.dispatch('setError', error)
  })
})

const wrapper = {
  connect (forceful) {
    forEach(connectors, connector => connector.connect(forceful))
  },
  disconnect () {
    forEach(connectors, connector => connector.disconnect())
  },
  shootsEmitter,
  shootEmitter,
  journalIssuesEmitter,
  journalCommentsEmitter
}

export default wrapper
