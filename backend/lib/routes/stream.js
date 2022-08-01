//
// SPDX-FileCopyrightText: 2022 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const express = require('express')
const createError = require('http-errors')
const { createSession } = require('better-sse')
const { authorization } = require('../services')
const channels = require('../channels')

const router = module.exports = express.Router()

const allowedMethods = methods => {
  return (req, res, next) => {
    try {
      const method = req.method
      if (!methods.includes(method)) {
        throw createError(405, `Request method ${method} is not allowed for the SSE endpoint`)
      }
      next()
    } catch (err) {
      next(err)
    }
  }
}

const authorizationMiddleware = {
  async isAdmin (req, res, next) {
    try {
      const user = req.user
      if (!await authorization.isAdmin(user)) {
        throw createError(403, 'No authorization to subscribe to "shoots" in all namespaces')
      }
      next()
    } catch (err) {
      next(err)
    }
  },
  async canListShoots (req, res, next) {
    try {
      const user = req.user
      const namespace = req.params.namespace
      if (!await authorization.canListShoots(user, namespace)) {
        throw createError(403, `No authorization to subscribe to "shoots" in namespace "${namespace}"`)
      }
      next()
    } catch (err) {
      next(err)
    }
  }
}

router.use(allowedMethods(['GET']))

router.get('/shoots', [authorizationMiddleware.isAdmin], async (req, res) => {
  const user = req.user
  const session = await createSession(req, res, {
    headers: {
      'cache-control': 'no-transform'
    }
  })
  Object.assign(session.state, {
    username: user.id,
    groups: user.groups,
    administrator: true
  })
  channels.shoots.register(session)
})

router.get('/:namespace/shoots', [authorizationMiddleware.canListShoots], async (req, res) => {
  const user = req.user
  const namespace = req.params.namespace
  const session = await createSession(req, res, {
    headers: {
      'cache-control': 'no-transform'
    }
  })
  Object.assign(session.state, {
    username: user.id,
    groups: user.groups,
    administrator: false,
    namespace
  })
  channels.shoots.register(session)
})
