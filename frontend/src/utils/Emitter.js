//
// Copyright (c) 2018 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file
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
import concat from 'lodash/concat'
import Emitter from 'component-emitter'
import { ThrottledNamespacedEventEmitter } from './ThrottledEmitter'
import store from '../store'

class SocketAuthenticator {
  constructor (socket) {
    this.authenticated = false
    this.auth = {
      bearer: undefined
    }
    this.socket = socket
    this.handlers = []
  }

  addHandler (handler) {
    this.handlers = concat(this.handlers, handler)
  }

  authenticate () {
    console.log(`socket connection ${this.socket.id} authenticating`)
    if (this.auth.bearer) {
      this.socket.emit('authentication', this.auth)
    }
  }

  onAuthenticated () {
    this.authenticated = true
    console.log(`socket connection ${this.socket.id} authenticated`)
    store.dispatch('unsetWebsocketConnectionError')

    forEach(this.handlers, handler => handler.onAuthenticated())
  }

  onConnect (attempt) {
    if (attempt) {
      console.log(`socket connection ${this.socket.id} established after '${attempt}' attempt(s)`)
    } else {
      console.log(`socket connection ${this.socket.id} established`)
    }
    this.authenticate()
  }

  onDisconnect (reason) {
    console.error(`socket connection lost because`, reason)
    this.authenticated = false
    store.dispatch('setWebsocketConnectionError', { reason })

    forEach(this.handlers, handler => handler.onDisconnect())
  }

  setUser (user) {
    user = user || {}
    const id_token = user.id_token
    /* eslint camelcase: off */
    if (!id_token) {
      console.log(`Disconnect socket ${this.socket.id} because ID token is empty`)
      this.auth.bearer = undefined
      this.socket.disconnect()
    } else if (!this.socket.connected) {
      this.auth.bearer = id_token
      this.socket.connect()
    } else if (this.auth.bearer !== id_token) {
      console.log(`Socket ${this.socket.id} connected but has different ID token`)
      this.auth.bearer = id_token
      const onDisconnect = (reason) => {
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
  constructor (socketAuthenticator) {
    socketAuthenticator.addHandler(this)

    this.socketAuthenticator = socketAuthenticator
    this.socket = this.socketAuthenticator.socket
  }

  onAuthenticated () {
    if (this.subscribeTo) {
      this.subscribe()
    }
  }

  onDisconnect () {
    this.subscribeOnNextTrigger()
  }

  subscribe = async function () {
    if (this.subscribeTo) {
      if (!this.subscribedTo || !isEqual(this.subscribedTo, this.subscribeTo)) {
        if (this.socketAuthenticator.authenticated) {
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
    if (this.socketAuthenticator.authenticated) {
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
  * subscribeOnNextTrigger: trigger could be onAuthenticated or by calling subscribe
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
  constructor (socketAuthenticator) {
    super(socketAuthenticator)

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

  subscribeShoots = function ({ namespace, filter }) {
    this.subscribeOnNextTrigger({ namespace, filter })
    this.subscribe()
  }

  _subscribe = async function () {
    const { namespace, filter } = this.subscribeTo

    await Promise.all([
      store.dispatch('clearShoots'),
      store.dispatch('setShootsLoading')
    ])
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
  constructor (socketAuthenticator) {
    super(socketAuthenticator)

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

  _subscribe = async function () {
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
  constructor (socketAuthenticator) {
    super(socketAuthenticator)

    this.socket.on('events', ({ kind, events }) => {
      this.emit(kind, events)
    })
  }

  setUser (user) {
    if (!store.getters.isAdmin) {
      return
    }
    super.setUser(user)
  }
}

class IssuesSubscription extends AbstractJournalsSubscription {
  onAuthenticated () {
    super.onAuthenticated()

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

  _subscribe = async function () {
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

  _subscribe = async function () {
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

const shootsSocketAuthenticator = new SocketAuthenticator(io(`${url}/shoots`, socketConfig))
const journalsSocketAuthenticator = new SocketAuthenticator(io(`${url}/journals`, socketConfig))

const shootsEmitter = Emitter(new ShootsSubscription(shootsSocketAuthenticator))
const shootEmitter = Emitter(new ShootSubscription(shootsSocketAuthenticator))
const journalIssuesEmitter = Emitter(new IssuesSubscription(journalsSocketAuthenticator))
const journalCommentsEmitter = Emitter(new CommentsSubscription(journalsSocketAuthenticator))

const socketAuthenticators = [shootsSocketAuthenticator, journalsSocketAuthenticator]

/* Web Socket Connection */

forEach(socketAuthenticators, emitter => {
  emitter.socket.on('connect', attempt => emitter.onConnect(attempt))
  emitter.socket.on('reconnect', attempt => emitter.onConnect(attempt))
  emitter.socket.on('authenticated', () => emitter.onAuthenticated())
  emitter.socket.on('disconnect', reason => emitter.onDisconnect(reason))
  emitter.socket.on('connect_error', err => {
    console.error(`socket connection error ${err}`)
  })
  emitter.socket.on('connect_timeout', () => {
    console.error(`socket ${emitter.socket.id} connection timeout`)
  })
  emitter.socket.on('reconnect_attempt', () => {
    console.log(`socket ${emitter.socket.id} reconnect attempt`)
  })
  emitter.socket.on('reconnecting', attempt => {
    store.dispatch('setWebsocketConnectionError', { reconnectAttempt: attempt })
    console.log(`socket ${emitter.socket.id} reconnecting attempt number '${attempt}'`)
  })
  emitter.socket.on('reconnect_error', err => {
    console.error(`socket ${emitter.socket.id} reconnect error ${err}`)
  })
  emitter.socket.on('reconnect_failed', () => {
    console.error(`socket ${emitter.socket.id} couldn't reconnect`)
  })
  emitter.socket.on('error', err => {
    console.error(`socket ${emitter.socket.id} error ${err}`)
  })
  emitter.socket.on('subscription_error', error => {
    const { kind, code, message } = error
    console.error(`socket ${emitter.socket.id} ${kind} subscription error: ${message} (${code})`)
    store.dispatch('setError', error)
  })
})

const wrapper = {
  setUser (user) {
    forEach(socketAuthenticators, emitter => emitter.setUser(user))
  },
  shootsEmitter,
  shootEmitter,
  journalIssuesEmitter,
  journalCommentsEmitter
}

window.GARDEN = { emitter: shootsEmitter }

export default wrapper
