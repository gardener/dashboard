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

const { assign, cloneDeep, isFunction, isString, isPlainObject, replace, join, concat, get, set, unset } = require('lodash')
const { parse, format } = require('url')
const { EventEmitter } = require('events')
const WebSocket = require('ws')
const logger = require('../logger')
const inject = require('reconnect-core')

function encodeBase64Url (input) {
  let output = encodeBase64(input)
  output = replace(output, /=/g, '')
  output = replace(output, /\+/g, '-')
  output = replace(output, /\//g, '_')
  return output
}

function encodeBase64 (input) {
  return Buffer.from(input, 'utf8').toString('base64')
}

function createError (code, reason) {
  const err = new Error(reason)
  err.code = code
  return err
}

function createErrorEvent ({message, error}) {
  const type = 'ERROR'
  const annotations = {
    'websocket.sapcloud.io/message': message
  }
  const object = {
    kind: 'Status',
    apiVersion: 'v1',
    metadata: {annotations},
    status: 'Failure',
    message: error.message,
    reason: error.constructor.name,
    code: 500
  }
  return {type, object}
}

function wrap (emitter, ws) {
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

  function onError (err) {
    ws.removeListener('error', onError)
    emitter.emit('error', err)
    onClose(4000, err.message)
  }

  function onMessage (message) {
    let event
    try {
      event = JSON.parse(message)
    } catch (error) {
      event = createErrorEvent({message, error})
    }
    emitter.emit('event', event)
  }

  function onClose (code, reason) {
    logger.debug('watch closed', code, reason)
    ws.removeListener('close', onClose)
    ws.removeListener('message', onMessage)
    stopPingPong()
    emitter.emit('close', createError(code, reason))
  }

  ws
    .once('open', onOpen)
    .on('message', onMessage)

    .on('error', onError)
    .on('close', onClose)

  emitter.websocket = ws
  emitter.end = () => ws.terminate()

  return emitter
}

function createWebSocket (resource, options) {
  const api = resource.api
  const url = parse(api.url)
  url.protocol = replace(url.protocol, /^http/, 'ws')
  url.href = url.path = url.search = undefined
  url.query = assign({}, resource.qs, options.qs, {watch: true})
  url.pathname = join(resource._path(options), '/')
  const { key, cert, ca, strictSSL, auth = {} } = get(api, 'http.requestOptions', {})
  const origin = get(options, 'origin', api.url)
  const rejectUnauthorized = get(options, 'rejectUnauthorized', !strictSSL)
  const headers = {}
  const websocketOptions = {origin, headers, rejectUnauthorized, key, cert, ca}
  const protocols = []

  if (isPlainObject(auth)) {
    const bearer = auth.bearer
    const user = auth.user || auth.username
    const pass = auth.pass || auth.password || ''
    if (bearer) {
      if (options.useBearerAuthorizationProtocol === true) {
        protocols.unshift(`base64url.bearer.authorization.k8s.io.${encodeBase64Url(bearer)}`)
      } else {
        headers.authorization = `bearer ${encodeURIComponent(bearer)}`
      }
    } else if (user) {
      headers.authorization = `basic ${encodeBase64(join([user, pass], ':'))}`
    }
  }

  assign(headers, options.headers)

  if (protocols.length) {
    websocketOptions.protocol = join(concat(protocols, 'garden'), ',')
  }

  return new WebSocket(format(url), websocketOptions)
}

async function createWebSocketAsync (resource, options) {
  const getResourceVersion = get(options, 'qs.resourceVersion')
  if (isFunction(getResourceVersion)) {
    options = cloneDeep(options)
    unset(options, 'qs.resourceVersion')
    set(options, 'qs.resourceVersion', await getResourceVersion.call(resource, options))
  }
  return createWebSocket(resource, options)
}

function wrapConnection (emitter, resource, options) {
  try {
    wrap(emitter, createWebSocket(resource, options))
  } catch (err) {
    emitter.emit('error', err)
  }
}

async function wrapConnectionAsync (emitter, resource, options) {
  try {
    wrap(emitter, await createWebSocketAsync(resource, options))
  } catch (err) {
    emitter.emit('error', err)
  }
}

function createConnection (resource, options) {
  const emitter = new EventEmitter()
  emitter.resourceName = resource._name
  const {qs = {}} = options
  if (!isFunction(qs.resourceVersion)) {
    wrapConnection(emitter, resource, options)
  } else {
    wrapConnectionAsync(emitter, resource, options)
  }
  return emitter
}

function watch (options = {}) {
  if (isString(options)) {
    options = {name: options}
  }

  const {name, qs, headers, useBearerAuthorizationProtocol, ...rest} = options
  const reconnectDefaults = {
    initialDelay: 5e2,
    maxDelay: 15e3,
    strategy: 'fibonacci',
    failAfter: Infinity,
    randomisationFactor: 0,
    immediate: false
  }
  const reconnect = inject(createConnection)
  const onConnect = emitter => emitter.on('event', event => reconnector.emit('event', event))
  const reconnector = reconnect(assign(reconnectDefaults, rest), onConnect)
  reconnector.connect(this, {name, qs, headers, useBearerAuthorizationProtocol})
  reconnector.resourceName = this._name
  return reconnector
}

module.exports = watch
