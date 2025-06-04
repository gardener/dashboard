//
// SPDX-FileCopyrightText: 2022 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { Server } from 'socket.io'
import logger from '../logger/index.js'
import helper from './helper.js'
import dispatcher from './dispatcher.js'

function init (httpServer, cache) {
  const io = new Server(httpServer, {
    path: '/api/events',
    serveClient: false,
  })

  // middleware
  io.use(helper.authenticationMiddleware())

  // handle connections (see https://socket.io/docs/v4/server-application-structure)
  io.on('connection', socket => {
    const socketId = socket.id
    const timeoutId = socket.data.timeoutId
    delete socket.data.timeoutId

    helper.joinPrivateRoom(socket)

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
