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
  socketIOAuth(io, {
    timeout: 5000,
    authenticate (socket, data, cb) {
      logger.debug('Socket %s authenticating', socket.id)
      const bearer = data.bearer || data.token
      const auth = {bearer}
      const req = {auth}
      const res = {}
      const next = (err) => {
        if (err) {
          logger.error('Socket %s authentication failed: "%s"', socket.id, err.message)
          return cb(err)
        }
        logger.debug('Socket %s authenticated (user %s)', socket.id, res.user.email)
        socket.client.user = res.user
        cb(null, true)
      }
      jwtIO(req, res, next)
    }
  })
  // handle socket connections
  io.on('connection', socket => {
    logger.debug('Socket %s connected', socket.id)
    socket.on('disconnect', (reason) => {
      logger.debug('Socket %s disconnected', socket.id)
    })
    socket.on('subscribe', async ({namespaces} = []) => {
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
        _.forEach(namespaces, (ns) => {
          const predicate = item => item.metadata.namespace === ns
          const project = _.find(projectList, predicate)
          if (project) {
            logger.debug('Socket %s subscribed to %s', socket.id, ns)
            socket.join(ns)
            const shootListPromise = shoots.list({user, ns})
            shootsPromises.push(new Promise(async () => {
              const shootList = await Promise.resolve(shootListPromise)
              const events = []
              _.forEach(shootList.items, (shoot) => {
                shoot.kind = 'Shoot'
                events.push({type: 'ADDED', object: shoot})
              })
              socket.emit('batchEvent', events)
            }))
          }
        })
        await Promise.all(shootsPromises)
      }
    })
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
