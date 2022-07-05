//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const assert = require('assert').strict
const _ = require('lodash')
const createServer = require('socket.io')
const logger = require('./logger')
const security = require('./security')
const { isHttpError, Unauthorized } = require('http-errors')
const { STATUS_CODES } = require('http')

const { EventsEmitter, NamespacedBatchEmitter } = require('./utils/batchEmitter')
const { tickets } = require('./services')
const { authorization, shoots, projects } = require('./services/io')

async function listNamespaces (user) {
  const projectList = await projects.list({ user })
  return _.map(projectList, 'spec.namespace')
}

function socketAuthentication (nsp) {
  const authenticate = security.authenticateSocket()
  nsp.use(async (socket, next) => {
    logger.debug('Socket %s authenticating', socket.id)
    try {
      const user = await authenticate(socket)
      logger.debug('Socket %s authenticated (user %s)', socket.id, user.id)
      next()
    } catch (err) {
      logger.error('Socket %s authentication failed: %s', socket.id, err)
      if (isHttpError(err)) {
        err.data = _.pick(err, ['statusCode', 'code'])
      }
      next(err)
    }
  })
}

function onDisconnect (reason) {
  logger.debug('Socket %s disconnected. Reason: %s', this.id, reason)
}

function getUserFromSocket (socket) {
  const user = _.get(socket, 'client.user')
  if (!user) {
    logger.error('Could not get client.user from socket', socket.id)
  }
  return user
}

function joinRoom (socket, room) {
  socket.join(room)
  logger.debug('Socket %s subscribed to room %s', socket.id, room)
}

function leaveRooms (socket, prefix) {
  logger.debug('Socket %s leaving all %s rooms', socket.id, prefix)
  for (const room of socket.rooms) {
    if (room !== socket.id && room.startsWith(prefix)) {
      socket.leave(room)
    }
  }
}

function leaveShootsAndShootRoom (socket) {
  leaveRooms(socket, 'shoot')
}

function leaveIssuesRoom (socket) {
  leaveRooms(socket, 'issues')
}

function leaveCommentsRooms (socket) {
  leaveRooms(socket, 'comments')
}

async function subscribeShoots (socket, { namespace, namespaces, filter, user }) {
  leaveShootsAndShootRoom(socket)

  // subscribe for all namespaces or a single namespace
  assert.ok(Array.isArray(namespaces) || namespace, 'Either namespaces or namespace is required')
  if (!namespace) {
    namespace = '_all'
  } else {
    namespaces = [namespace]
  }

  /* join current rooms */
  const kind = 'shoots'
  const eventName = 'shoots'
  const objectKeyPath = 'metadata.uid'
  const batchEmitter = new NamespacedBatchEmitter({ eventName, kind, socket, objectKeyPath })

  await Promise.all(namespaces.map(async namespace => {
    // join room
    const room = filter ? `shoots_${namespace}_${filter}` : `shoots_${namespace}`
    joinRoom(socket, room)
    try {
      // fetch shoots for namespace
      const shootsWithIssuesOnly = !!filter
      const shootList = await shoots.list({ user, namespace, shootsWithIssuesOnly })
      batchEmitter.batchEmitObjects(shootList.items, namespace)
    } catch (error) {
      logger.error('Socket %s: failed to list to shoots: %s', socket.id, error)
      socket.emit('subscription_error', {
        kind,
        code: 500,
        message: `Failed to fetch clusters for namespace ${namespace}`
      })
    }
  }))
  batchEmitter.flush()
  socket.emit('subscription_done', {
    kind,
    namespace
  })
}

async function subscribeShootsAdmin (socket, { namespaces, filter, user }) {
  leaveShootsAndShootRoom(socket)

  const kind = 'shoots'
  const eventName = 'shoots'
  const objectKeyPath = 'metadata.uid'
  const batchEmitter = new NamespacedBatchEmitter({ eventName, kind, socket, objectKeyPath })
  const shootsWithIssuesOnly = !!filter

  try {
    // join rooms
    for (const namespace of namespaces) {
      const room = filter ? `shoots_${namespace}_${filter}` : `shoots_${namespace}`
      socket.join(room)
    }
    logger.debug('Socket %s subscribed to shoot rooms for all namespaces', socket.id)

    // fetch shoots
    const shootList = await shoots.list({ user, shootsWithIssuesOnly })
    _
      .chain(shootList)
      .get('items')
      .groupBy('metadata.namespace')
      .forEach((objects, namespace) => batchEmitter.batchEmitObjects(objects, namespace))
      .commit()
  } catch (error) {
    logger.error('Socket %s: failed to subscribe to shoots: %s', socket.id, error)
    socket.emit('subscription_error', {
      kind,
      code: 500,
      message: 'Failed to fetch clusters'
    })
  }
  batchEmitter.flush()
  socket.emit('subscription_done', {
    kind,
    namespace: '_all'
  })
}

async function subscribeShoot (socket, { namespace, name }) {
  leaveShootsAndShootRoom(socket)

  const user = getUserFromSocket(socket)
  const room = `shoot_${namespace}_${name}`

  try {
    const object = await shoots.read({ user, namespace, name })
    joinRoom(socket, room)
    return object
  } catch (err) {
    let {
      code = 500,
      reason = 'InternalServerError',
      status = 'Failure',
      message = 'Failed to fetch cluster'
    } = err
    if (isHttpError(err)) {
      code = err.statusCode
      reason = STATUS_CODES[code]
      if (code === 404) {
        try {
          const allowed = await authorization.canGetShoot(user, namespace, name)
          if (allowed) {
            status = 'Success'
            joinRoom(socket, room)
          }
        } catch (err) {
          logger.error('Socket %s: get permission to read shoot failed:  %s', socket.id, err)
        }
      }
    }
    return {
      kind: 'Status',
      apiVersion: 'v1',
      status,
      message,
      code,
      reason
    }
  }
}

function registerShootHandlers (socket, cache) {
  socket.on('subscribeAllShoots', async ({ filter }) => {
    const kind = 'shoots'
    try {
      const user = getUserFromSocket(socket)
      const namespaces = await listNamespaces(user)

      if (await authorization.isAdmin(user)) {
        subscribeShootsAdmin(socket, { namespaces, filter, user })
      } else {
        subscribeShoots(socket, { namespaces, filter, user })
      }
    } catch (err) {
      logger.error('Socket %s: failed to subscribe to all shoots: %s', socket.id, err)
      socket.emit('subscription_error', {
        kind,
        code: 500,
        message: 'Failed to fetch clusters'
      })
    }
  })
  socket.on('subscribeShoots', async ({ namespace, filter }) => {
    const kind = 'shoots'
    try {
      const user = getUserFromSocket(socket)
      const namespaces = await listNamespaces(user)
      if (!_.includes(namespaces, namespace)) {
        throw new Unauthorized(`Not authorized to subscribe for shoots in namepsace ${namespace}`)
      }

      subscribeShoots(socket, { namespace, filter, user })
    } catch (err) {
      logger.error('Socket %s: failed to subscribe to shoots: %s', socket.id, err)
      socket.emit('subscription_error', {
        kind,
        code: 500,
        message: 'Failed to fetch clusters'
      })
    }
  })
  socket.on('subscribeShoot', async ({ name, namespace }, done) => {
    const object = await subscribeShoot(socket, { name, namespace })
    if (object.kind === 'Status' && object.status === 'Failure') {
      const { code, message } = object
      logger.error('Socket %s: failed to subscribe to shoot: (%d) %s', socket.id, code, message)
    }
    done(object)
  })
}

function registerTicketHandlers (socket, cache, ticketCache) {
  socket.on('subscribeIssues', async () => {
    leaveIssuesRoom(socket)

    const kind = 'issues'
    const eventName = 'issues'

    try {
      joinRoom(socket, 'issues')

      const batchEmitter = new EventsEmitter({ eventName, kind, socket })
      batchEmitter.batchEmitObjectsAndFlush(ticketCache.getIssues())
    } catch (error) {
      logger.error('Socket %s: failed to fetch issues: %s', socket.id, error)
      socket.emit('subscription_error', { kind, code: 500, message: 'Failed to fetch issues' })
    }
    socket.emit('subscription_done', { kind })
  })
  socket.on('subscribeComments', async ({ name, namespace }) => {
    leaveCommentsRooms(socket)

    const kind = 'comments'
    const eventName = 'comments'

    try {
      const projectName = cache.findProjectByNamespace(namespace).metadata.name
      const room = `comments_${projectName}/${name}`
      joinRoom(socket, room)

      const batchEmitter = new EventsEmitter({ eventName, kind, socket })
      const numbers = ticketCache.getIssueNumbersForNameAndProjectName({ name, projectName })
      for (const number of numbers) {
        try {
          const comments = await tickets.getIssueComments({ number })
          batchEmitter.batchEmitObjects(comments)
        } catch (err) {
          logger.error('Socket %s: failed to fetch comments for %s/%s issue %s: %s', socket.id, namespace, name, number, err)
          socket.emit('subscription_error', { kind, code: 500, message: `Failed to fetch comments for issue ${number}` })
        }
      }
      batchEmitter.flush()
    } catch (error) {
      logger.error('Socket %s: failed to fetch comments for %s/%s: %s', socket.id, namespace, name, error)
      socket.emit('subscription_error', { kind, code: 500, message: 'Failed to fetch comments' })
    }
    socket.emit('subscription_done', { kind, namespace, name })
  })
  socket.on('unsubscribeComments', () => {
    leaveCommentsRooms(socket)
  })
}

function initializeServer (httpServer, cache) {
  const ticketCache = cache.getTicketCache()
  const io = createServer(httpServer, {
    path: '/api/events',
    serveClient: false
  })
  // middleware
  socketAuthentication(io)
  // handle connections (see https://socket.io/docs/v3/server-application-structure/#each-file-registers-its-own-event-handlers)
  io.on('connection', socket => {
    logger.debug('Socket %s connected', socket.id)
    registerShootHandlers(socket, cache)
    registerTicketHandlers(socket, cache, ticketCache)
    socket.on('disconnect', onDisconnect)
  })

  // return io instance
  return io
}

module.exports = initializeServer
