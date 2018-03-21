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

'use strict'

const _ = require('lodash')
const socketIO = require('socket.io')
const socketIOAuth = require('socketio-auth')
const logger = require('./logger')
const { jwt } = require('./middleware')
const { projects, shoots } = require('./services')
const watches = require('./watches')
const { shootHasIssue } = require('./utils')

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

  // handle socket connections
  const nsp = io.of('/shoots')
  nsp.on('connection', socket => {
    logger.debug('Socket %s connected', socket.id)
    socket.on('disconnect', (reason) => {
      logger.debug('Socket %s disconnected. Reason: %s', socket.id, reason)
    })
    socket.on('subscribe', async ({namespaces}) => {
      /* leave previous rooms */
      _
        .chain(socket.rooms)
        .keys()
        .filter(key => key !== socket.id)
        .each(key => socket.leave(key))
        .commit()

      /* join current rooms */
      if (_.isArray(namespaces)) {
        const user = _.get(socket, 'client.user')
        user.id = user['email']
        const projectList = await projects.list({user})
        const shootsPromises = []

        let postponedData = {}
        const postponedObjectsCount = () => _.sum(_.map(postponedData, objects => objects.length))

        _.forEach(namespaces, (nsObj) => {
          const namespace = _.get(nsObj, 'namespace')
          const filter = _.get(nsObj, 'filter')
          const predicate = item => item.metadata.namespace === namespace
          const project = _.find(projectList, predicate)
          if (project) {
            const room = filter ? `${namespace}_${filter}` : namespace
            socket.join(room)
            logger.debug('Socket %s subscribed to %s', socket.id, room)
            shootsPromises.push(new Promise(async (resolve, reject) => {
              const shootList = await shoots.list({user, namespace})
              const objects = _.filter(shootList.items, (shoot) => filter !== 'issues' || shootHasIssue(shoot))
              _.forEach(_.chunk(objects, 50), (chunkedObjects) => {
                postponedData[namespace] = chunkedObjects
                if (postponedObjectsCount() >= 10) {
                  socket.emit('batchEvent', {kind: 'shoots', type: 'ADDED', data: postponedData})
                  postponedData = {}
                }
              })

              resolve()
            }))
          }
        })

        await Promise.all(shootsPromises)
        if (postponedObjectsCount() !== 0) {
          socket.emit('batchEvent', {kind: 'shoots', type: 'ADDED', data: postponedData})
        }
        socket.emit('batchEventDone', {kind: 'shoots', namespaces})
        logger.debug('Emitted batch events to socket %s', socket.id)
      }
    })
  })
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
        }
        if (err) {
          logger.error('Socket %s authentication failed: "%s"', socket.id, err.message)
          return cb(err)
        }
        logger.debug('Socket %s authenticated (user %s)', socket.id, user.email)
        socket.client.user = user

        cb(null, true)
      }
      jwtIO(req, res, next)
    }
  })

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
