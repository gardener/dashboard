//
// SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

const crypto = require('crypto')
const { promisify } = require('util')
const createError = require('http-errors')
const cookieParser = require('cookie-parser')
const kubernetesClient = require('@gardener-dashboard/kube-client')
const logger = require('../logger')
const { authenticate } = require('../security')

const { isHttpError } = createError

function expiresIn (socket) {
  const user = getUserFromSocket(socket)
  const refreshAt = user?.refresh_at ?? 0
  return Math.max(0, refreshAt * 1000 - Date.now())
}

function authenticateFn (options) {
  const cookieParserAsync = promisify(cookieParser())
  const authenticateAsync = promisify(authenticate(options))
  const noop = () => { }
  const res = {
    clearCookie: noop,
    cookie: noop,
  }

  return async req => {
    await cookieParserAsync(req, res)
    await authenticateAsync(req, res)
    logger.info('User: %s', req.user)
    return req.user
  }
}

function authenticationMiddleware () {
  const authenticate = authenticateFn(kubernetesClient)

  return async (socket, next) => {
    logger.debug('Socket %s authenticating', socket.id)
    try {
      const user = socket.data.user = await authenticate(socket.request)
      logger.debug('Socket %s authenticated (user %s)', socket.id, user.id)
      if (user.rti) {
        const delay = expiresIn(socket)
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
  }
}

function getUserFromSocket (socket) {
  const user = socket.data?.user
  if (!user) {
    logger.error('Could not get "data.user" from socket', socket.id)
  }
  return user
}

function setDisconnectTimeout (socket, delay) {
  delay = Math.min(2147483647, delay) // setTimeout delay must not exceed 32-bit signed integer
  logger.debug('Socket %s will expire in %d seconds', socket.id, Math.floor(delay / 1000))
  socket.data.timeoutId = setTimeout(() => {
    logger.debug('Socket %s is expired. Forcefully disconnecting client', socket.id)
    socket.disconnect(true)
  }, delay)
}

function sha256 (data) {
  return crypto.createHash('sha256').update(data).digest('hex')
}

function joinPrivateRoom (socket) {
  const user = getUserFromSocket(socket)
  return socket.join(sha256(user.id))
}

const helper = module.exports = {
  authenticationMiddleware,
  getUserFromSocket,
  setDisconnectTimeout,
  sha256,
  joinPrivateRoom,
}
