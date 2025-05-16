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
const { cloneDeep } = require('lodash')
const cache = require('../cache')
const logger = require('../logger')
const authorization = require('../services/authorization')
const { authenticate } = require('../security')
const { simplifyObjectMetadata } = require('../utils')

const { isHttpError } = createError

function expiresIn (socket) {
  const user = getUserFromSocket(socket)
  const refreshAt = user?.refresh_at ?? 0
  return Math.max(0, refreshAt * 1000 - Date.now())
}

async function userProfiles (req, res, next) {
  try {
    const [
      canListProjects,
      canListSeeds,
    ] = await Promise.all([
      authorization.canListProjects(req.user),
      authorization.canListSeeds(req.user),
    ])
    const profiles = Object.freeze({
      canListProjects,
      canListSeeds,
    })
    Object.defineProperty(req.user, 'profiles', {
      value: profiles,
      enumerable: true,
    })
    next()
  } catch (err) {
    next(err)
  }
}

function authenticateFn (options) {
  const cookieParserAsync = promisify(cookieParser())
  const authenticateAsync = authenticate(options)
  const userProfilesAsync = userProfiles
  const noop = () => { }
  const res = {
    clearCookie: noop,
    cookie: noop,
  }
  const next = err => {
    if (err) {
      throw err
    }
  }

  return async req => {
    await cookieParserAsync(req, res) // Note: We intentionally omit the 'next' callback here because promisify automatically appends an error-first callback (err, value) => { ... } to the function arguments.
    await authenticateAsync(req, res, next)
    await userProfilesAsync(req, res, next)
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

function uidNotFoundFactory (group, kind) {
  return uid => ({
    kind: 'Status',
    apiVersion: 'v1',
    status: 'Failure',
    message: `${kind} with uid ${uid} does not exist`,
    reason: 'NotFound',
    details: {
      uid,
      group,
      kind,
    },
    code: 404,
  })
}

const constants = Object.freeze({
  OBJECT_NONE: 0,
  OBJECT_SIMPLE: 1,
  OBJECT_ORIGINAL: 2,
})

function synchronizeFactory (kind, options = {}) {
  const {
    group = 'core.gardener.cloud',
    accessResolver = () => constants.OBJECT_SIMPLE,
    simplifyObject = simplifyObjectMetadata,
  } = options
  const uidNotFound = uidNotFoundFactory(group, kind)

  return (socket, uids = []) => {
    return uids.map(uid => {
      const object = cache.getByUid(kind, uid)
      if (!object) {
        // the object has been removed from the cache
        return uidNotFound(uid)
      }
      switch (accessResolver(socket, object)) {
        case constants.OBJECT_SIMPLE: {
          const clonedObject = cloneDeep(object)
          simplifyObject(clonedObject)
          return clonedObject
        }
        case constants.OBJECT_ORIGINAL: {
          return object
        }
        default: {
          // the user has no authorization to access the object
          return uidNotFound(uid)
        }
      }
    })
  }
}

const helper = module.exports = {
  constants,
  authenticationMiddleware,
  getUserFromSocket,
  setDisconnectTimeout,
  sha256,
  joinPrivateRoom,
  synchronizeFactory,
}
