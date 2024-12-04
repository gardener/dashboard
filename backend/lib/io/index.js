//
// SPDX-FileCopyrightText: 2022 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const createServer = require('socket.io')
const createError = require('http-errors')
const kubernetesClient = require('@gardener-dashboard/kube-client')
const logger = require('../logger')
const helper = require('./helper')
const dispatcher = require('./dispatcher')

const { isHttpError } = createError

function init (httpServer, cache) {
  const io = createServer(httpServer, {
    path: '/api/events',
    serveClient: false,
  })

  // middleware
  const authenticate = helper.authenticateFn(kubernetesClient)
  io.use(async (socket, next) => {
    logger.debug('Socket %s authenticating', socket.id)
    try {
      const user = socket.data.user = await authenticate(socket.request)
      logger.debug('Socket %s authenticated (user %s)', socket.id, user.id)
      if (user.rti) {
        const delay = helper.expiresIn(socket)
        if (delay > 0) {
          helper.setDisconnectTimeout(socket, delay)
        } else {
          throw createError(401, 'Token refresh required', {
            code: 'ERR_JWT_TOKEN_REFRESH_REQUIRED',
            data: {
              rti: user.rti,
              exp: user.refresh_at,
            },
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

exports = module.exports = init
