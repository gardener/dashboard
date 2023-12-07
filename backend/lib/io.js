//
// SPDX-FileCopyrightText: 2022 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { promisify } = require('util')
const createServer = require('socket.io')
const cookieParser = require('cookie-parser')
const createError = require('http-errors')
const kubernetesClient = require('@gardener-dashboard/kube-client')
const cache = require('./cache')
const logger = require('./logger')
const { projectFilter, trimObjectMetadata, parseRooms } = require('./utils')
const { authenticate } = require('./security')
const { authorization } = require('./services')

const { isHttpError } = createError

function expiresIn (socket) {
  const user = getUserFromSocket(socket)
  const refreshAt = user?.refresh_at ?? 0
  return Math.max(0, refreshAt * 1000 - Date.now())
}

function authenticateFn (options) {
  const cookieParserAsync = promisify(cookieParser())
  const authenticateAsync = promisify(authenticate(options))
  const noop = () => {}
  const res = {
    clearCookie: noop,
    cookie: noop
  }

  return async req => {
    await cookieParserAsync(req, res)
    await authenticateAsync(req, res)
    return req.user
  }
}

function getUserFromSocket (socket) {
  const user = socket.data?.user
  if (!user) {
    logger.error('Could not get "data.user" from socket', socket.id)
  }
  return user
}

async function canListAllShoots (user, namespaces) {
  const canListShoots = async namespace => [namespace, await authorization.canListShoots(user, namespace)]
  const results = await Promise.all(namespaces.map(canListShoots))
  for (const [namespace, allowed] of results) {
    if (!allowed) {
      logger.error('User %s has no authorization to subscribe shoots in namespace %s', user.id, namespace)
      return false
    }
  }
  return true
}

function getAllNamespaces (user) {
  return cache.getProjects()
    .filter(projectFilter(user, false))
    .map(project => project.spec.namespace)
}

async function subscribeShoots (socket, { namespace, name, labelSelector }) {
  const user = getUserFromSocket(socket)

  const joinRoom = room => {
    logger.debug('User %s joined rooms [%s]', user.id, room)
    return socket.join(room)
  }

  if (namespace && name) {
    if (await authorization.canGetShoot(user, namespace, name)) {
      return joinRoom(`shoots;${namespace}/${name}`)
    }
  } else if (namespace !== '_all') {
    if (await authorization.canListShoots(user, namespace)) {
      return joinRoom(`shoots;${namespace}`)
    }
  } else {
    let room = 'shoots'
    if (labelSelector === 'shoot.gardener.cloud/status!=healthy') {
      room += ':unhealthy'
    }
    if (await authorization.isAdmin(user)) {
      return joinRoom(room + ':admin')
    }
    const namespaces = getAllNamespaces(user)
    if (await canListAllShoots(user, namespaces)) {
      const rooms = namespaces.map(namespace => room + `;${namespace}`)
      return joinRoom(rooms)
    }
  }
  throw createError(403, 'Insufficient authorization for shoot subscription')
}

async function subscribe (socket, key, options = {}) {
  switch (key) {
    case 'shoots':
      await unsubscribeShoots(socket)
      return subscribeShoots(socket, options)
    default:
      throw new TypeError(`Invalid subscription type - ${key}`)
  }
}

function unsubscribeShoots (socket) {
  const promises = Array.from(socket.rooms)
    .filter(room => room !== socket.id && room.startsWith('shoots'))
    .map(room => socket.leave(room))
  return Promise.all(promises)
}

async function unsubscribe (socket, key) {
  switch (key) {
    case 'shoots':
      return unsubscribeShoots(socket)
    default:
      throw new TypeError(`Invalid subscription type - ${key}`)
  }
}

function synchronizeShoots (socket, uids = []) {
  const rooms = Array.from(socket.rooms).filter(room => room !== socket.id)
  const [
    isAdmin,
    namespaces,
    qualifiedNames
  ] = parseRooms(rooms)

  const uidNotFound = uid => {
    return {
      kind: 'Status',
      apiVersion: 'v1',
      status: 'Failure',
      message: `Shoot with uid ${uid} does not exist`,
      reason: 'NotFound',
      details: {
        uid,
        group: 'core.gardener.cloud',
        kind: 'shoots'
      },
      code: 404
    }
  }
  return uids.map(uid => {
    const object = cache.getShootByUid(uid)
    if (!object) {
      // the shoot has been removed from the cache
      return uidNotFound(uid)
    }
    const { namespace, name } = object.metadata
    const qualifiedName = [namespace, name].join('/')
    const hasValidSubscription = isAdmin || namespaces.includes(namespace) || qualifiedNames.includes(qualifiedName)
    if (!hasValidSubscription) {
      // the socket has NOT joined a room (admin, namespace or individual shoot) the current shoot belongs to
      return uidNotFound(uid)
    }
    // only send all shoot details for single shoot subscriptions
    if (!qualifiedNames.includes(qualifiedName)) {
      trimObjectMetadata(object)
    }
    return object
  })
}

function synchronize (socket, key, ...args) {
  switch (key) {
    case 'shoots': {
      const [uids] = args
      if (!Array.isArray(uids)) {
        throw new TypeError('Invalid parameters for synchronize shoots')
      }
      return synchronizeShoots(socket, uids)
    }
    default:
      throw new TypeError(`Invalid synchronization type - ${key}`)
  }
}

function setDisconnectTimeout (socket, delay) {
  delay = Math.min(2147483647, delay) // setTimeout delay must not exceed 32-bit signed integer
  logger.debug('Socket %s will expire in %d seconds', socket.id, Math.floor(delay / 1000))
  socket.data.timeoutId = setTimeout(() => {
    logger.debug('Socket %s is expired. Forcefully disconnecting client', socket.id)
    socket.disconnect(true)
  }, delay)
}

function init (httpServer, cache) {
  const io = createServer(httpServer, {
    path: '/api/events',
    serveClient: false
  })

  // middleware
  const authenticate = authenticateFn(kubernetesClient)
  io.use(async (socket, next) => {
    logger.debug('Socket %s authenticating', socket.id)
    try {
      const user = socket.data.user = await authenticate(socket.request)
      logger.debug('Socket %s authenticated (user %s)', socket.id, user.id)
      if (user.rti) {
        const delay = expiresIn(socket)
        if (delay > 0) {
          exports.setDisconnectTimeout(socket, delay)
        } else {
          throw createError(401, 'Token refresh required', {
            code: 'ERR_JWT_TOKEN_REFRESH_REQUIRED',
            data: {
              rti: user.rti,
              exp: user.refresh_at
            }
          })
        }
      }
      next()
    } catch (err) {
      logger.error('Socket %s authentication failed: %s', socket.id, err)
      if (isHttpError(err)) {
        // additional details (see https://socket.io/docs/v4/server-api/#namespaceusefn)
        const { statusCode, code, data } = err
        err.data = { statusCode, code, ...data }
      }
      next(err)
    }
  })

  // handle connections (see https://socket.io/docs/v4/server-application-structure)
  io.on('connection', socket => {
    const socketId = socket.id
    const timeoutId = socket.data.timeoutId
    delete socket.data.timeoutId

    // handle 'subscribe' events
    socket.on('subscribe', async (key, ...args) => {
      const done = args.pop()
      try {
        await subscribe(socket, key, ...args)
        done({ statusCode: 200 })
      } catch (err) {
        logger.error('Socket %s subscribe error: %s', socket.id, err.message)
        const { statusCode = 500, name, message } = err
        done({ statusCode, name, message })
      }
    })

    // handle 'unsubscribe' events
    socket.on('unsubscribe', async (key, done) => {
      try {
        await unsubscribe(socket, key)
        done({ statusCode: 200 })
      } catch (err) {
        logger.error('Socket %s unsubscribe error: %s', socket.id, err.message)
        const { statusCode = 500, name, message } = err
        done({ statusCode, name, message })
      }
    })

    // handle 'synchronize' events
    socket.on('synchronize', async (key, ...args) => {
      const done = args.pop()
      try {
        const items = await synchronize(socket, key, ...args)
        done({ statusCode: 200, items })
      } catch (err) {
        logger.error('Socket %s synchronize error: %s', socket.id, err.message)
        const { statusCode = 500, name, message } = err
        done({ statusCode, name, message })
      }
    })

    // handle 'disconnect' event
    socket.once('disconnect', reason => {
      clearTimeout(timeoutId)
      logger.debug('Socket %s disconnected. Reason: %s', socketId, reason)
    })
  })

  // return io instance
  return io
}

exports = module.exports = init

exports.setDisconnectTimeout = setDisconnectTimeout
