//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const _ = require('lodash')
const createServer = require('socket.io')
const logger = require('./logger')
const security = require('./security')
const { Forbidden, isHttpError } = require('http-errors')
const { STATUS_CODES } = require('http')

const kubernetesClient = require('@gardener-dashboard/kube-client')

const { EventsEmitter, NamespacedBatchEmitter } = require('./utils/batchEmitter')
const { projects, shoots, tickets, authorization } = require('./services')

function socketAuthentication (nsp) {
  const authenticate = security.authenticateSocket(kubernetesClient)
  nsp.use(async (socket, next) => {
    logger.debug('Socket %s authenticating', socket.id)
    try {
      const user = await authenticate(socket)
      logger.debug('Socket %s authenticated (user %s)', socket.id, user.id)
      next()
    } catch (err) {
      logger.error('Socket %s authentication failed: "%s"', socket.id, err.message)
      next(new Forbidden(err.message))
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
  logger.debug('Socket %s subscribed to room "%s"', socket.id, room)
}

function leaveRooms (socket, predicate = _.identity) {
  _
    .chain(socket.rooms)
    .keys()
    .filter(predicate)
    .each(room => {
      logger.debug('Socket %s leaving room %s', socket.id, room)
      socket.leave(room)
    })
    .commit()
}

function leaveShootsAndShootRoom (socket) {
  const predicate = room => room !== socket.id
  leaveRooms(socket, predicate)
}

function leaveIssuesRoom (socket) {
  const predicate = room => room !== socket.id && !_.startsWith(room, 'comments_')
  leaveRooms(socket, predicate)
}

function leaveCommentsRooms (socket) {
  const predicate = room => room !== socket.id && room !== 'issues'
  leaveRooms(socket, predicate)
}

async function subscribeShoots ({ socket, namespacesAndFilters, projectList }) {
  leaveShootsAndShootRoom(socket)

  /* join current rooms */
  if (!_.isArray(namespacesAndFilters)) {
    return
  }
  const kind = 'shoots'
  const user = getUserFromSocket(socket)
  const batchEmitter = new NamespacedBatchEmitter({ kind, socket, objectKeyPath: 'metadata.uid' })

  await _
    .chain(namespacesAndFilters)
    .filter(({ namespace }) => !!_.find(projectList, ['metadata.namespace', namespace]))
    .map(async ({ namespace, filter }) => {
      // join room
      const shootsWithIssuesOnly = !!filter
      const room = filter ? `shoots_${namespace}_${filter}` : `shoots_${namespace}`
      joinRoom(socket, room)
      try {
        // fetch shoots for namespace
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
    })
    .thru(promises => Promise.all(promises))
    .value()

  batchEmitter.flush()
  socket.emit('batchNamespacedEventsDone', {
    kind,
    namespaces: _.map(namespacesAndFilters, 'namespace')
  })
}

async function subscribeShootsAdmin ({ socket, user, namespaces, filter }) {
  leaveShootsAndShootRoom(socket)

  const kind = 'shoots'
  const batchEmitter = new NamespacedBatchEmitter({ kind, socket, objectKeyPath: 'metadata.uid' })
  const shootsWithIssuesOnly = !!filter

  try {
    // join rooms
    _.forEach(namespaces, namespace => {
      const room = filter ? `shoots_${namespace}_${filter}` : `shoots_${namespace}`
      joinRoom(socket, room)
    })

    // fetch shoots
    const shootList = await shoots.list({ user, shootsWithIssuesOnly })
    const batchEmitObjects = _
      .chain(batchEmitter)
      .bindKey('batchEmitObjects')
      .ary(2)
      .value()

    _
      .chain(shootList)
      .get('items')
      .groupBy('metadata.namespace')
      .forEach(batchEmitObjects)
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
  socket.emit('batchNamespacedEventsDone', {
    kind,
    namespaces
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

function setupShootsNamespace (shootsNsp) {
  // handle socket connections
  shootsNsp.on('connection', socket => {
    logger.debug('Socket %s connected', socket.id)

    socket.on('disconnect', onDisconnect)
    socket.on('subscribeAllShoots', async ({ filter }) => {
      try {
        const user = getUserFromSocket(socket)
        const projectList = await projects.list({ user })
        const namespaces = _.map(projectList, 'metadata.namespace')

        if (await authorization.isAdmin(user)) {
          subscribeShootsAdmin({ socket, user, namespaces, filter })
        } else {
          const namespacesAndFilters = _.map(namespaces, (namespace) => { return { namespace, filter } })
          subscribeShoots({ socket, namespacesAndFilters, projectList })
        }
      } catch (err) {
        logger.error('Socket %s: failed to subscribe to all shoots: %s', socket.id, err)
        socket.emit('subscription_error', {
          kind: 'shoots',
          code: 500,
          message: 'Failed to fetch clusters'
        })
      }
    })
    socket.on('subscribeShoots', async ({ namespaces }) => {
      try {
        const user = getUserFromSocket(socket)
        const projectList = await projects.list({ user })
        subscribeShoots({ namespacesAndFilters: namespaces, socket, projectList })
      } catch (err) {
        logger.error('Socket %s: failed to subscribe to shoots: %s', socket.id, err)
        socket.emit('subscription_error', {
          kind: 'shoots',
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
  })
  socketAuthentication(shootsNsp)
}

function setupTicketsNamespace (ticketsNsp, cache) {
  const ticketCache = cache.getTicketCache()

  ticketsNsp.on('connection', socket => {
    logger.debug('Socket %s connected', socket.id)

    socket.on('disconnect', onDisconnect)
    socket.on('subscribeIssues', async () => {
      leaveIssuesRoom(socket)

      const kind = 'issues'

      try {
        joinRoom(socket, 'issues')

        const batchEmitter = new EventsEmitter({ kind, socket })
        batchEmitter.batchEmitObjectsAndFlush(ticketCache.getIssues())
      } catch (error) {
        logger.error('Socket %s: failed to fetch issues: %s', socket.id, error)
        socket.emit('subscription_error', { kind, code: 500, message: 'Failed to fetch issues' })
      }
      socket.emit('batchEventsDone', { kind })
    })
    socket.on('subscribeComments', async ({ name, namespace }) => {
      leaveCommentsRooms(socket)

      const kind = 'comments'

      try {
        const projectName = cache.findProjectByNamespace(namespace).metadata.name
        const room = `comments_${projectName}/${name}`
        joinRoom(socket, room)

        const batchEmitter = new EventsEmitter({ kind, socket })
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
      socket.emit('batchEventsDone', { kind, namespace, name })
    })
    socket.on('unsubscribeComments', () => {
      leaveCommentsRooms(socket)
    })
  })
  socketAuthentication(ticketsNsp)
}

function initializeServer (httpServer, cache) {
  const io = createServer(httpServer, {
    path: '/api/events',
    serveClient: false
  })
  // setup namespaces
  setupShootsNamespace(io.of('/shoots'))
  setupTicketsNamespace(io.of('/tickets'), cache)
  // return io instance
  return io
}

module.exports = initializeServer
