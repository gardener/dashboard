//
// Copyright 2018 by The Gardener Authors.
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
import toLower from 'lodash/toLower'
import forEach from 'lodash/forEach'
import Emitter from 'component-emitter'
import store from '../store'

const socket = io(window.location.origin, {
  path: '/api/events',
  transports: ['websocket'],
  autoConnect: false
})

/* Event Emitter */
const emitter = Emitter({
  authenticated: false,
  namespace: undefined,
  auth: {
    bearer: undefined
  },
  get socket () {
    return socket
  },
  setUser (user) {
    user = user || {}
    const id_token = user.id_token
    /* eslint camelcase: off */
    if (!id_token) {
      console.log(`Disconnect socket because ID token is empty`)
      this.auth.bearer = undefined
      socket.disconnect()
    } else if (!socket.connected) {
      console.log(`Socket not connected.`)
      this.auth.bearer = id_token
      socket.connect()
    } else if (this.auth.bearer !== id_token) {
      console.log(`Socket ${socket.id} connected but has different ID token`)
      this.auth.bearer = id_token
      const onDisconnect = (reason) => {
        if (reason === 'io client disconnect') {
          clearTimeout(timeoutId)
          socket.connect()
        }
      }
      const onTimeout = () => {
        socket.off('disconnect', onDisconnect)
      }
      const timeoutId = setTimeout(onTimeout, 1000)
      socket.once('disconnect', onDisconnect)
      socket.disconnect()
    }
  },
  setNamespace (namespace, allNamespaces) {
    this.namespace = namespace
    if (this.namespace && this.authenticated) {
      if (namespace === '_all') {
        socket.emit('subscribe', {namespaces: allNamespaces})
      } else {
        socket.emit('subscribe', {namespaces: [namespace]})
      }
    }
  },
  authenticate () {
    console.log('socket connection authenticating')
    if (this.auth.bearer) {
      socket.emit('authentication', this.auth)
    }
  }
})

function onAuthenticated () {
  emitter.authenticated = true
  emitter.emit('authenticated')
  console.log('socket connection authenticated')
  const handleEvent = ({type, object}) => {
    const {kind} = object
    const objectKind = toLower(kind)
    switch (type) {
      case 'ADDED':
      case 'MODIFIED':
        emitter.emit(objectKind, {type: 'put', object})
        break
      case 'DELETED':
        emitter.emit(objectKind, {type: 'delete', object})
        break
      case 'ERROR':
        emitter.emit('error', object)
        console.error('Kubernetes error', object)
        break
    }
  }
  socket.on('event', handleEvent)
  socket.on('batchEvent', async (events) => {
    await store.dispatch('clearShoots')
    forEach(events, handleEvent)
  })
  const namespace = emitter.namespace
  if (namespace) {
    socket.emit('subscribe', {namespaces: [namespace]})
  }
}

function onConnect (attempt) {
  if (attempt) {
    console.log(`socket connection established after '${attempt}' attempt(s)`)
  } else {
    console.log('socket connection established')
  }
  emitter.authenticate()
}

function onDisconnect (reason) {
  console.error(`socket connection lost because '${reason}'`)
  emitter.authenticated = false
  socket.off('event')
  emitter.emit('disconnect', reason)
}

/* Web Socket Connection */

socket.on('connect', onConnect)
socket.on('reconnect', onConnect)
socket.on('authenticated', onAuthenticated)
socket.on('disconnect', onDisconnect)
socket.on('connect_error', err => {
  console.error('socket connection error', err)
})
socket.on('connect_timeout', () => {
  console.error('socket connection timeout')
})
socket.on('reconnect_attempt', () => {
  console.log('socket reconnect attempt')
})
socket.on('reconnecting', attempt => {
  console.log(`socket reconnecting attempt number '${attempt}'`)
})
socket.on('reconnect_error', err => {
  console.error('socket reconnect error', err)
})
socket.on('reconnect_failed', () => {
  console.error('socket couldn\'t reconnect')
})
socket.on('error', err => {
  console.error('socket socket error', err)
})

window.GARDEN = {emitter}

export default emitter
