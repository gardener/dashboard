//
// SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

const { promisify } = require('util')
const cookieParser = require('cookie-parser')
const logger = require('../logger')
const { authenticate } = require('../security')

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
    return req.user
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

exports = module.exports = {
  expiresIn,
  authenticateFn,
  getUserFromSocket,
  setDisconnectTimeout,
}
