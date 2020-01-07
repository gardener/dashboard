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

'use strict'

const { join } = require('path')
const EventEmitter = require('events')
const WebSocket = require('ws')
const inject = require('reconnect-core')

const { http } = require('./symbols')
const { validateLabelValue } = require('./util')

const logger = require('../logger')
const { GatewayTimeout, InternalServerError } = require('../errors')

class WatchBuilder {
  constructor (resource, url, searchParams, name) {
    const {
      prefixUrl,
      ca,
      key,
      cert,
      servername,
      rejectUnauthorized,
      headers
    } = resource[http.client].defaults.options
    this.url = new URL(prefixUrl)
    this.url.protocol = this.url.protocol.replace(/^http/, 'ws')
    this.url.pathname = join(this.url.pathname, url)
    searchParams.set('watch', true)
    if (name) {
      validateLabelValue(name)
      let fieldSelector = `metadata.name=${name}`
      if (searchParams.has('fieldSelector')) {
        fieldSelector += ',' + searchParams.get('fieldSelector')
      }
      searchParams.set('fieldSelector', fieldSelector)
    }
    this.url.search = searchParams.toString()
    this.resourceName = resource.constructor.names.plural
    this.options = {
      origin: this.url.origin,
      servername,
      headers,
      key,
      cert,
      ca,
      rejectUnauthorized
    }
  }

  createWatch () {
    const createWebSocket = this.constructor.createWebSocket

    const createConnection = () => {
      const connection = new EventEmitter()
      connection.resourceName = this.resourceName
      wrapWebSocket(connection, createWebSocket(this.url, this.options))
      return connection
    }

    const onConnect = connection => {
      connection.on('event', event => reconnector.emit('event', event))
    }

    const reconnector = inject(createConnection)({
      initialDelay: 5e2,
      maxDelay: 15e3,
      strategy: 'fibonacci',
      failAfter: Infinity,
      randomisationFactor: 0,
      immediate: false
    }, onConnect)
    reconnector.resourceName = this.resourceName
    reconnector.waitFor = waitFor
    reconnector.connect()
    return reconnector
  }

  static create (...args) {
    return new WatchBuilder(...args).createWatch()
  }

  static createWebSocket (...args) {
    return new WebSocket(...args)
  }

  static setWaitFor (object) {
    object.waitFor = waitFor
  }
}

function createError (code, reason) {
  const err = new Error(reason)
  err.code = code
  return err
}

function createErrorEvent ({ message, error }) {
  const type = 'ERROR'
  const annotations = {
    'websocket.gardener.cloud/message': message
  }
  const object = {
    kind: 'Status',
    apiVersion: 'v1',
    metadata: { annotations },
    status: 'Failure',
    message: error.message,
    reason: error.constructor.name,
    code: 500
  }
  return { type, object }
}

function wrapWebSocket (emitter, ws) {
  const state = {
    name: emitter.resourceName,
    isAlive: false
  }

  function startPingPong () {
    ws.on('pong', onPong)
    state.isAlive = true
    state.timestamp = Date.now()
    state.intervalId = setInterval(ping, 15000)
    logger.debug(`ping-${state.timestamp} started for watch ${state.name}`)
  }

  function stopPingPong () {
    if (state.intervalId) {
      clearInterval(state.intervalId)
      state.intervalId = undefined
      logger.debug(`ping-${state.timestamp} stopped for watch ${state.name}`)
    }
    ws.removeListener('pong', onPong)
  }

  function ping () {
    if (state.isAlive === true) {
      state.isAlive = false
      try {
        ws.ping()
      } catch (err) {
        logger.error(`ping-${state.timestamp} ping error for watch ${state.name}`, err.message)
      }
    } else {
      stopPingPong()
      ws.terminate()
    }
  }

  function onOpen () {
    emitter.emit('connect')
    startPingPong()
  }

  function onPong () {
    state.isAlive = true
  }

  function onError (error) {
    ws.removeListener('error', onError)
    logger.error('websocket error', error)
    onClose(4000, error.message)
  }

  function onMessage (message) {
    let event
    try {
      event = JSON.parse(message)
    } catch (error) {
      event = createErrorEvent({ message, error })
    }
    emitter.emit('event', event)
  }

  function onClose (code, reason) {
    logger.debug('watch closed', code, reason)
    ws.removeAllListeners()
    ws.removeListener('close', onClose)
    ws.removeListener('message', onMessage)
    stopPingPong()
    emitter.emit('close', createError(code, reason))
  }

  ws.once('open', onOpen)
    .on('message', onMessage)
    .on('error', onError)
    .on('close', onClose)

  emitter.websocket = ws
  emitter.end = () => ws.terminate()

  return emitter
}

function waitFor (condition, { timeout = 5000 }) {
  const watch = this
  const resourceName = this.resourceName
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      done(new GatewayTimeout(`Resource "${resourceName}" could not be initialized within ${timeout} ms`))
    }, timeout)

    function done (err, obj) {
      clearTimeout(timeoutId)

      watch.removeListener('event', onEvent)
      watch.removeListener('disconnect', onDisconnect)
      watch.removeListener('error', logError)
      watch.once('error', ignoreError)

      watch.disconnect()
      if (err) {
        return reject(err)
      }
      resolve(obj)
    }

    function onEvent (event) {
      try {
        switch (event.type) {
          case 'ADDED':
          case 'MODIFIED':
            if (condition(event.object)) {
              done(null, event.object)
            }
            break
          case 'DELETED':
            throw new InternalServerError(`Resource "${resourceName}" has been deleted`)
        }
      } catch (err) {
        done(err)
      }
    }

    function logError (err) {
      logger.error('Error watching Resource "%s": %s', resourceName, err.message)
    }

    function ignoreError () {
    }

    function onDisconnect (err) {
      done(err || new InternalServerError(`Watch for Resource "${resourceName}" has been disconnected`))
    }

    watch.on('event', onEvent)
    watch.on('error', logError)
    watch.on('disconnect', onDisconnect)
  })
}

module.exports = WatchBuilder
