//
// SPDX-FileCopyrightText: 2022 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const createServer = require('socket.io')
const logger = require('../logger')
const helper = require('./helper')
const dispatcher = require('./dispatcher')

let io

function init (httpServer, workspace) {
  if (!io) {
    io = createServer(httpServer, {
      path: '/api/events',
      serveClient: false,
    })
  }

  const handleConnection = socket => {
    const socketId = socket.id
    const timeoutId = socket.data.timeoutId
    delete socket.data.timeoutId

    helper.joinPrivateRoom(socket)

    // Handle 'subscribe' events
    socket.on('subscribe', async (key, ...args) => {
      logger.debug('Socket %s subscribed to %s in workspace %s', socket.id, key, workspace)
      const done = args.pop()
      try {
        await dispatcher.subscribe(socket, key, ...args)
        done({ statusCode: 200 })
      } catch (err) {
        logger.error('Socket %s subscribe error in workspace %s: %s', socket.id, workspace, err.message)
        const { statusCode = 500, name, message } = err
        done({ statusCode, name, message })
      }
    })

    // Handle 'unsubscribe' events
    socket.on('unsubscribe', async (key, done) => {
      try {
        await dispatcher.unsubscribe(socket, key)
        done({ statusCode: 200 })
      } catch (err) {
        logger.error('Socket %s unsubscribe error in workspace %s: %s', socket.id, workspace, err.message)
        const { statusCode = 500, name, message } = err
        done({ statusCode, name, message })
      }
    })

    // Handle 'synchronize' events
    socket.on('synchronize', async (key, ...args) => {
      const done = args.pop()
      try {
        const items = await dispatcher.synchronize(socket, workspace, key, ...args)
        done({ statusCode: 200, items })
      } catch (err) {
        logger.error('Socket %s synchronize error in workspace %s: %s', socket.id, workspace, err.message)
        const { statusCode = 500, name, message } = err
        done({ statusCode, name, message })
      }
    })

    // Handle the 'disconnect' event
    socket.once('disconnect', reason => {
      clearTimeout(timeoutId)
      logger.debug('Socket %s disconnected from workspace %s. Reason: %s', socketId, workspace, reason)
    })
  }

  if (workspace) {
    // Each workspace gets its own namespace
    const nsp = io.of(`/${workspace}`)

    // middleware
    nsp.use(helper.authenticationMiddleware())

    // handle connections (see https://socket.io/docs/v4/server-application-structure)
    nsp.on('connection', handleConnection)

    return nsp
  } else {
    // middleware
    io.use(helper.authenticationMiddleware())

    // handle connections (see https://socket.io/docs/v4/server-application-structure)
    io.on('connection', handleConnection)

    // return io instance
    return io
  }
}

exports = module.exports = init
