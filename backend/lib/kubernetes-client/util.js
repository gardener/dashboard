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

const _ = require('lodash')
const fs = require('fs')
const os = require('os')
const path = require('path')
const yaml = require('js-yaml')
const logger = require('../logger')
const { GatewayTimeout, InternalServerError } = require('../errors')

function ctors (filename) {
  const basename = path.basename(filename)
  const dirname = path.dirname(filename)
  const baseDir = path.relative(__dirname, dirname)
  const files = fs.readdirSync(dirname)
  const data = {}
  for (const file of files) {
    if (file !== basename) {
      const Ctor = require(`./${baseDir}/${file}`)
      const { name, names: { plural } = {} } = Ctor
      data[plural || name.toLowerCase()] = Ctor
    }
  }
  return data
}

function findByName (items, name) {
  for (const item of items) {
    if (item.name === name) {
      return item
    }
  }
}

function getInCluster ({
  KUBERNETES_SERVICE_HOST: host,
  KUBERNETES_SERVICE_PORT: port
} = {}) {
  if (!host || !port) {
    throw new TypeError('Failed to load in-cluster configuration, kubernetes service endpoint not defined')
  }
  const baseDir = '/var/run/secrets/kubernetes.io/serviceaccount/'
  const tokenPath = path.join(baseDir, 'token')
  const token = fs.readFileSync(tokenPath, 'utf8')
  if (!token) {
    throw new TypeError('Failed to load in-cluster configuration, serviceaccount token not found')
  }

  const caPath = path.join(baseDir, 'ca.crt')
  const ca = fs.readFileSync(caPath, 'utf8')
  if (!ca) {
    throw new TypeError('Failed to load in-cluster configuration, serviceaccount certificate authority not found')
  }

  const config = {
    url: `https://${host}:${port}`,
    ca,
    rejectUnauthorized: true,
    auth: {
      bearer: token
    }
  }
  return config
}

function readKubeconfig (filename) {
  if (!filename) {
    filename = path.join(os.homedir(), '.kube', 'config')
  }
  if (filename.indexOf(':') !== -1) {
    filename = filename.split(':')
  }
  // use the first kubeconfig file
  if (Array.isArray(filename)) {
    filename = filename.shift()
  }
  const dirname = path.dirname(filename)
  const config = yaml.safeLoad(fs.readFileSync(filename))
  const resolvePath = (object, key) => {
    if (object[key]) {
      object[key] = path.resolve(dirname, object[key])
    }
  }
  for (const { cluster } of Object.values(config.cluster)) {
    resolvePath(cluster, 'certificate-authority')
  }
  for (const { user } of Object.values(config.users)) {
    resolvePath(user, 'client-key')
    resolvePath(user, 'client-certificate')
  }
  return config
}

function parseKubeconfig (input) {
  if (input) {
    switch (typeof input) {
      case 'string':
        return yaml.safeLoad(input)
      default:
        return input
    }
  }
  throw new TypeError('Kubeconfig must not be empty')
}

function cleanKubeconfig (input) {
  const cleanCluster = ({ name, cluster }) => {
    cluster = _.pick(cluster, ['server', 'insecure-skip-tls-verify', 'certificate-authority-data'])
    return { name, cluster }
  }
  const cleanContext = ({ name, context }) => {
    context = _.pick(context, ['cluster', 'user', 'namespace'])
    return { name, context }
  }
  const cleanAuthInfo = ({ name, user }) => {
    user = _.pick(user, ['client-certificate-data', 'client-key-data', 'token', 'username', 'password'])
    return { name, user }
  }
  const cleanConfig = ({
    apiVersion = 'v1',
    kind = 'Config',
    clusters,
    contexts,
    'current-context': currentContext,
    users
  }) => {
    return {
      apiVersion,
      kind,
      clusters: _.map(clusters, cleanCluster),
      contexts: _.map(contexts, cleanContext),
      'current-context': currentContext,
      users: _.map(users, cleanAuthInfo)
    }
  }
  return cleanConfig(parseKubeconfig(input))
}

function fromKubeconfig (input) {
  const {
    clusters,
    contexts,
    'current-context': currentContext,
    users
  } = parseKubeconfig(input)

  // inline certificates and keys
  const readCertificate = (obj, name) => {
    if (obj[name]) {
      return fs.readFileSync(obj[name])
    }
    if (obj[`${name}-data`]) {
      return Buffer.from(obj[`${name}-data`], 'base64').toString('utf8')
    }
  }

  // get current user and cluster
  const { context } = findByName(contexts, currentContext) || {}
  const { cluster } = findByName(clusters, context.cluster) || {}
  const { user } = findByName(users, context.user) || {}

  const config = {
    rejectUnauthorized: true
  }

  if (cluster) {
    config.url = cluster.server
    const ca = readCertificate(cluster, 'certificate-authority')
    if (ca) {
      config.ca = ca
    }
    if ('insecure-skip-tls-verify' in cluster) {
      config.rejectUnauthorized = !cluster['insecure-skip-tls-verify']
    }
  }

  if (user) {
    const cert = readCertificate(user, 'client-certificate')
    const key = readCertificate(user, 'client-key')
    if (cert && key) {
      config.cert = cert
      config.key = key
    }
    if (user.token) {
      config.auth = {
        bearer: user.token
      }
    } else if (user.username && user.password) {
      config.auth = {
        user: user.username,
        pass: user.password
      }
    }
  }

  return config
}

function dumpKubeconfig ({ user, context = 'default', cluster = 'garden', namespace, token, server, caData }) {
  return yaml.safeDump({
    apiVersion: 'v1',
    kind: 'Config',
    clusters: [{
      name: cluster,
      cluster: {
        'certificate-authority-data': caData,
        server
      }
    }],
    users: [{
      name: user,
      user: {
        token
      }
    }],
    contexts: [{
      name: context,
      context: {
        cluster,
        user,
        namespace
      }
    }],
    'current-context': context
  })
}

function mergeConfig ({ auth, key, cert, privileged, ...options } = {}, config) {
  if (!options.url) {
    options.url = config.url
    options.ca = config.ca
    options.rejectUnauthorized = config.rejectUnauthorized
  }
  if (key && cert) {
    options.key = key
    options.cert = cert
  } else if (auth) {
    options.auth = auth
  } else if (privileged === true) {
    if (config.key && config.cert) {
      options.key = config.key
      options.cert = config.cert
    } else if (config.auth) {
      options.auth = config.auth
    }
  }
  return options
}

function base64Encode (value) {
  return Buffer.from(value, 'utf8').toString('base64')
}

function base64Decode (value) {
  return Buffer.from(value, 'base64').toString('utf8')
}

function setHeader (options, key, value) {
  if (!options.headers) {
    options.headers = {}
  }
  options.headers[key] = value
  return options
}

function setAuthorization (options, type, credentials) {
  type = type.toLowerCase()
  switch (type) {
    case 'basic':
      return setHeader(
        options,
        'authorization',
        `Basic ${base64Encode(credentials)}`
      )
    case 'bearer':
      return setHeader(options, 'authorization', `Bearer ${credentials}`)
    default:
      throw new TypeError('The authentication type must be one of [basic bearer]')
  }
}

function setContentType (options, value) {
  return setHeader(options, 'Content-Type', value)
}

function setPatchType (options, type = 'merge') {
  switch (type) {
    case 'json':
      return setContentType(options, 'application/json-patch+json')
    case 'merge':
      return setContentType(options, 'application/merge-patch+json')
    case 'strategic':
      return setContentType(options, 'application/strategic-merge-patch+json')
    default:
      throw new TypeError('The patch type must be one of [json merge strategic]')
  }
}

function base64UrlEncode (input) {
  let output = base64Encode(input)
  output = output.replace(/=/g, '')
  output = output.replace(/\+/g, '-')
  output = output.replace(/\//g, '_')
  return output
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
      logger.error(`Error watching Resource "%s": %s`, resourceName, err.message)
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

function isHttpError ({ name, response: { statusCode } = {} }, expectedStatusCode) {
  if (name !== 'HTTPError') {
    return false
  }
  if (expectedStatusCode) {
    if (Array.isArray(expectedStatusCode)) {
      return expectedStatusCode.indexOf(statusCode) !== -1
    }
    return expectedStatusCode === statusCode
  }
  return true
}

exports = module.exports = {
  ctors,
  findByName,
  getInCluster,
  readKubeconfig,
  fromKubeconfig,
  cleanKubeconfig,
  dumpKubeconfig,
  mergeConfig,
  base64Encode,
  base64UrlEncode,
  base64Decode,
  setHeader,
  setAuthorization,
  setContentType,
  setPatchType,
  wrapWebSocket,
  waitFor,
  isHttpError
}
