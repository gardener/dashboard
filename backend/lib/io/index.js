//
// SPDX-FileCopyrightText: 2022 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { Server } from 'socket.io'
import logger from '../logger/index.js'
import helper from './helper.js'
import dispatcher from './dispatcher.js'
import _ from 'lodash-es'
import config from '../config/index.js'

function init (httpServer, cache) {
  const allowedOrigins = config.io?.allowedOrigins
  if (!allowedOrigins || allowedOrigins.length === 0) {
    throw new Error('io.allowedOrigins configuration is required')
  }

  const allowAll = allowedOrigins.includes('*')

  const io = new Server(httpServer, {
    path: '/api/events',
    serveClient: false,
    transports: ['websocket'],
    allowRequest: (req, callback) => {
      if (allowAll) {
        return callback(null, true)
      }
      const { origin } = req.headers
      if (!origin) {
        return callback(null, true)
      }
      const isAllowed = allowedOrigins.includes(origin)
      if (!isAllowed) {
        logger.debug('Socket connection from disallowed origin %s rejected', origin)
      }
      callback(null, isAllowed)
    },
  })

  // middleware
  io.use(helper.authenticationMiddleware())

  // handle connections (see https://socket.io/docs/v4/server-application-structure)
  io.on('connection', socket => {
    const socketId = socket.id
    const timeoutId = socket.data.timeoutId
    delete socket.data.timeoutId

    helper.joinPrivateRoom(socket)

    const user = helper.getUserFromSocket(socket)
    if (_.get(user, ['profiles', 'canListSeeds'], false)) {
      socket.join('seeds')
      logger.debug('Socket %s auto-joined seeds room', socket.id)
    }

    // handle 'subscribe' events
    socket.on('subscribe', async (key, ...args) => {
      logger.debug('Socket %s subscribed to %s', socket.id, key)
      const done = args.pop()
      try {
        await dispatcher.subscribe(socket, key, ...args)
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
        await dispatcher.unsubscribe(socket, key)
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
        const items = await dispatcher.synchronize(socket, key, ...args)
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

export default init
