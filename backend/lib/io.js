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

'use strict'

const _ = require('lodash')
const socketIO = require('socket.io')
const socketIOAuth = require('socketio-auth')
const logger = require('./logger')
const { jwt } = require('./middleware')
const { projects, shoots, journals, administrators } = require('./services')
const watches = require('./watches')
const { shootHasIssue } = require('./utils')
const { EventsEmitter, NamespacedBatchEmitter } = require('./utils/batchEmitter')
const { getJournalCache } = require('./cache')

module.exports = () => {
  const io = socketIO({
    path: '/api/events',
    serveClient: false
  })
  // initialize socket authentication
  const jwtIO = jwt({
    resultProperty: 'user',
    getToken (req) {
      return req.auth.bearer
    }
  })

  const onDisconnect = function (reason) {
    logger.debug('Socket %s disconnected. Reason: %s', this.id, reason)
  }

  const leavePreviousRooms = (socket, filterFn) => {
    _
      .chain(socket.rooms)
      .keys()
      .filter(filterFn)
      .each(key => {
        logger.debug('Socket %s leaving room %s', socket.id, key)
        socket.leave(key)
      })
      .commit()
  }

  const socketAuthentication = nsp => {
    socketIOAuth(nsp, {
      timeout: 5000,
      authenticate (socket, data, cb) {
        logger.debug('Socket %s authenticating', socket.id)
        const bearer = data.bearer || data.token
        const auth = {bearer}
        const req = {auth}
        const res = {}
        const next = (err) => {
          const user = res.user
          if (user) {
            user.auth = auth
            user.id = user['email']
          } else {
            logger.error('Socket %s: no user on response object', socket.id)
          }
          if (err) {
            logger.error('Socket %s authentication failed: "%s"', socket.id, err.message)
            return cb(err)
          }
          logger.debug('Socket %s authenticated (user %s)', socket.id, _.get(user, 'email'))
          socket.client.user = user

          cb(null, true)
        }
        jwtIO(req, res, next)
      }
    })
  }

  const getUserFromSocket = socket => {
    const user = _.get(socket, 'client.user')
    if (!user) {
      logger.error('Could not get client.user from socket', _.get(socket, 'id'))
    }
    return user
  }

  const joinRoom = (socket, room) => {
    socket.join(room)
    logger.debug('Socket %s subscribed to %s', socket.id, room)
  }

  // handle socket connections
  const shootsNsp = io.of('/shoots')
  shootsNsp.on('connection', socket => {
    logger.debug('Socket %s connected', socket.id)

    const leaveShootsAndShootRoom = (socket) => {
      const filterFn = key => key !== socket.id
      leavePreviousRooms(socket, filterFn)
    }

    socket.on('disconnect', onDisconnect)
    socket.on('subscribeShoots', async ({namespaces}) => {
      leaveShootsAndShootRoom(socket)

      /* join current rooms */
      if (_.isArray(namespaces)) {
        const kind = 'shoots'
        const user = getUserFromSocket(socket)
        const batchEmitter = new NamespacedBatchEmitter({kind, socket, objectKeyPath: 'metadata.uid'})

        try {
          const shootsPromises = []
          const projectList = await projects.list({user})

          _.forEach(namespaces, (nsObj) => {
            const namespace = _.get(nsObj, 'namespace')
            const filter = _.get(nsObj, 'filter')
            const shootsWithIssuesOnly = !!filter
            const predicate = item => item.metadata.namespace === namespace
            const project = _.find(projectList, predicate)
            if (project) {
              const room = filter ? `shoots_${namespace}_${filter}` : `shoots_${namespace}`
              joinRoom(socket, room)

              shootsPromises.push(new Promise(async (resolve, reject) => {
                try {
                  const shootList = await shoots.list({user, namespace, shootsWithIssuesOnly})
                  const objects = _.filter(shootList.items, (shoot) => filter !== 'issues' || shootHasIssue(shoot))
                  batchEmitter.batchEmitObjects(objects, namespace)

                  resolve()
                } catch (error) {
                  reject(error)
                }
              }))
            }
          })

          await Promise.all(shootsPromises)
        } catch (error) {
          logger.error('Socket %s: failed to subscribe to shoots: %s', _.get(socket, 'id'), error)
          socket.emit('subscription_error', {kind, code: 500, message: 'Failed to fetch shoots'})
        }

        batchEmitter.flush()
        socket.emit('batchNamespacedEventsDone', {kind, namespaces: _.map(namespaces, nsObj => nsObj.namespace)})
      }
    })
    socket.on('subscribeShoot', async ({name, namespace}) => {
      leaveShootsAndShootRoom(socket)

      const kind = 'shoot'
      const user = getUserFromSocket(socket)
      const batchEmitter = new NamespacedBatchEmitter({kind, socket, objectKeyPath: 'metadata.uid'})
      try {
        const projectList = await projects.list({user})

        const predicate = item => item.metadata.namespace === namespace
        const project = _.find(projectList, predicate)
        if (project) {
          const room = `shoot_${namespace}_${name}`
          joinRoom(socket, room)

          const shoot = await shoots.read({user, name, namespace})
          batchEmitter.batchEmitObjects([shoot], namespace)
        }
      } catch (error) {
        logger.error('Socket %s: failed to subscribe to shoot: (%s) %s', _.get(socket, 'id'), error.code, error)
        socket.emit('subscription_error', {kind, code: error.code, message: 'Failed to fetch shoot'})
      }
      batchEmitter.flush()

      socket.emit('shootSubscriptionDone', {kind, target: {name, namespace}})
    })
  })
  const journalsNsp = io.of('/journals')
  journalsNsp.on('connection', socket => {
    logger.debug('Socket %s connected', socket.id)

    const leaveCommentRooms = (socket) => {
      const filterFn = key => key !== socket.id && key !== 'issues'
      leavePreviousRooms(socket, filterFn)
    }
    socket.on('disconnect', onDisconnect)
    socket.on('subscribeIssues', async () => {
      const filterFn = key => key !== socket.id && !_.startsWith(key, 'comments_')
      leavePreviousRooms(socket, filterFn)

      const kind = 'issues'

      const user = getUserFromSocket(socket)
      try {
        if (await administrators.isAdmin(user)) {
          joinRoom(socket, 'issues')

          const objects = getJournalCache().getIssues()

          const batchEmitter = new EventsEmitter({kind, socket})
          batchEmitter.batchEmitObjectsAndFlush(objects)
        } else {
          logger.warn('Socket %s: user %s tried to fetch journal but is no admin', _.get(socket, 'id'), _.get(user, 'email'))
          socket.emit('subscription_error', {kind, code: 403, message: 'Forbidden'})
        }
      } catch (error) {
        logger.error('Socket %s: failed to fetch issues: %s', _.get(socket, 'id'), error)
        socket.emit('subscription_error', {kind, code: 500, message: 'Failed to fetch issues'})
      }
    })
    socket.on('subscribeComments', async ({name, namespace}) => {
      leaveCommentRooms(socket)

      const kind = 'comments'

      const user = getUserFromSocket(socket)
      try {
        if (await administrators.isAdmin(user)) {
          joinRoom(socket, `comments_${namespace}/${name}`)

          const batchEmitter = new EventsEmitter({kind, socket})
          await journals.commentsForNameAndNamespace({
            name,
            namespace,
            batchFn: comments => {
              batchEmitter.batchEmitObjects(comments)
            }})
          batchEmitter.flush()
        } else {
          logger.warn('Socket %s: user %s tried to fetch journal comments but is no admin', _.get(socket, 'id'), _.get(user, 'email'))
          socket.emit('subscription_error', {kind, code: 403, message: 'Forbidden'})
        }
      } catch (error) {
        logger.error('Socket %s: failed to fetch comments for %s/%s: %s', _.get(socket, 'id'), namespace, name, error)
        socket.emit('subscription_error', {kind, code: 500, message: 'Failed to fetch comments'})
      }
    })
    socket.on('unsubscribeComments', () => {
      leaveCommentRooms(socket)
    })
  })

  socketAuthentication(shootsNsp)
  socketAuthentication(journalsNsp)

  // start watches
  _.forEach(watches, (watch, resourceName) => {
    try {
      watch(io)
    } catch (err) {
      logger.error(`watch ${resourceName} error`, err)
    }
  })
  // return io instance
  return io
}
