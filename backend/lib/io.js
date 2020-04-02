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
const socketIO = require('socket.io')
const logger = require('./logger')
const security = require('./security')
const { Forbidden } = require('./errors')

const kubernetesClient = require('./kubernetes-client')
const watches = require('./watches')
const cache = require('./cache')
const { EventsEmitter, NamespacedBatchEmitter } = require('./utils/batchEmitter')
const { projects, shoots, journals, authorization } = require('./services')

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
    socket.on('subscribeShoot', async ({ name, namespace }) => {
      leaveShootsAndShootRoom(socket)

      const kind = 'shoot'
      const user = getUserFromSocket(socket)
      const batchEmitter = new NamespacedBatchEmitter({ kind, socket, objectKeyPath: 'metadata.uid' })
      try {
        const projectList = await projects.list({ user })
        const project = _.find(projectList, ['metadata.namespace', namespace])
        if (project) {
          const room = `shoot_${namespace}_${name}`
          joinRoom(socket, room)

          const shoot = await shoots.read({ user, name, namespace })
          batchEmitter.batchEmitObjects([shoot], namespace)
        }
      } catch (error) {
        logger.error('Socket %s: failed to subscribe to shoot: (%s)', socket.id, error.code, error)
        socket.emit('subscription_error', {
          kind,
          code: error.code,
          message: 'Failed to fetch cluster'
        })
      }
      batchEmitter.flush()

      socket.emit('shootSubscriptionDone', { kind, target: { name, namespace } })
    })
  })
  socketAuthentication(shootsNsp)
}

function setupJournalsNamespace (journalsNsp) {
  const journalCache = cache.getJournalCache()

  journalsNsp.on('connection', socket => {
    logger.debug('Socket %s connected', socket.id)

    socket.on('disconnect', onDisconnect)
    socket.on('subscribeIssues', async () => {
      leaveIssuesRoom(socket)

      const kind = 'issues'

      const user = getUserFromSocket(socket)
      try {
        if (await authorization.isAdmin(user)) {
          joinRoom(socket, 'issues')

          const batchEmitter = new EventsEmitter({ kind, socket })
          batchEmitter.batchEmitObjectsAndFlush(journalCache.getIssues())
        } else {
          logger.warn('Socket %s: user %s tried to fetch journal but is no admin', socket.id, user.email)
          socket.emit('subscription_error', { kind, code: 403, message: 'Forbidden' })
        }
      } catch (error) {
        logger.error('Socket %s: failed to fetch issues: %s', socket.id, error)
        socket.emit('subscription_error', { kind, code: 500, message: 'Failed to fetch issues' })
      }
      socket.emit('batchEventsDone', { kind })
    })
    socket.on('subscribeComments', async ({ name, namespace }) => {
      leaveCommentsRooms(socket)

      const kind = 'comments'

      const user = getUserFromSocket(socket)
      try {
        if (await authorization.isAdmin(user)) {
          const room = `comments_${namespace}/${name}`
          joinRoom(socket, room)

          const batchEmitter = new EventsEmitter({ kind, socket })
          const numbers = journalCache.getIssueNumbersForNameAndNamespace({ name, namespace })
          for (const number of numbers) {
            try {
              const comments = await journals.getIssueComments({ number })
              batchEmitter.batchEmitObjects(comments)
            } catch (err) {
              logger.error('Socket %s: failed to fetch comments for %s/%s issue %s: %s', socket.id, namespace, name, number, err)
              socket.emit('subscription_error', { kind, code: 500, message: `Failed to fetch comments for issue ${number}` })
            }
          }
          batchEmitter.flush()
        } else {
          logger.warn('Socket %s: user %s tried to fetch journal comments but is no admin', socket.id, user.email)
          socket.emit('subscription_error', { kind, code: 403, message: 'Forbidden' })
        }
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
  socketAuthentication(journalsNsp)
}

function init () {
  const io = socketIO({
    path: '/api/events',
    serveClient: false
  })

  // setup namespaces
  setupShootsNamespace(io.of('/shoots'))
  setupJournalsNamespace(io.of('/journals'))
  // start watches
  for (const watch of Object.values(watches)) {
    watch(io)
  }
  // return io instance
  return io
}

module.exports = init
