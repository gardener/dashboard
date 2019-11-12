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

const fs = require('fs')
const os = require('os')
const path = require('path')
const yaml = require('js-yaml')
const logger = require('../logger')

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

function fromKubeconfig (filename = process.env.KUBECONFIG) {
  // use the first kubeconfig file
  filename = filename
    ? filename.split(':')
    : path.join(os.homedir(), '.kube', 'config')
  if (Array.isArray(filename)) {
    filename = filename.shift()
  }
  const {
    contexts,
    clusters,
    users,
    'current-context': currentContext
  } = yaml.safeLoad(fs.readFileSync(filename))

  // inline certificates and keys
  const dirname = path.dirname(filename)
  const readFile = (obj, name) => {
    if (obj[name]) {
      return fs.readFileSync(path.resolve(dirname, obj[name]))
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
    const ca = readFile(cluster, 'certificate-authority')
    if (ca) {
      config.ca = ca
    }
    if (Object.prototype.hasOwnProperty.call(cluster, 'insecure-skip-tls-verify')) {
      config.rejectUnauthorized = !cluster['insecure-skip-tls-verify']
    }
  }

  if (user) {
    const cert = readFile(user, 'client-certificate')
    const key = readFile(user, 'client-key')
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

function mergeConfig ({ auth, key, cert, ...options } = {}, config) {
  options.url = config.url
  options.ca = config.ca
  options.rejectUnauthorized = config.rejectUnauthorized
  if (key && cert) {
    options.key = key
    options.cert = cert
  } else if (auth) {
    options.auth = auth
  } else if (config.key && config.cert) {
    options.key = config.key
    options.cert = config.cert
  } else if (config.auth) {
    options.auth = config.auth
  }
  if (options.auth) {
    const auth = options.auth
    delete options.auth
    if (auth.bearer) {
      setAuthorization(options, 'bearer', auth.bearer)
    } else if (auth.user && auth.pass) {
      setAuthorization(options, 'basic', `${auth.user}:${auth.pass}`)
    } else if (typeof auth === 'string') {
      setAuthorization(options, 'basic', auth)
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
    'websocket.sapcloud.io/message': message
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

module.exports = {
  ctors,
  findByName,
  getInCluster,
  fromKubeconfig,
  mergeConfig,
  base64Encode,
  base64UrlEncode,
  base64Decode,
  setHeader,
  setAuthorization,
  setContentType,
  setPatchType,
  wrapWebSocket
}
