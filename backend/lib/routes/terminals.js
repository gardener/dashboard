//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const express = require('express')
const { terminals, authorization } = require('../services')
const { UnprocessableEntity } = require('http-errors')
const { metricsRoute } = require('../middleware')

const router = module.exports = express.Router({
  mergeParams: true
})

const metricsMiddleware = metricsRoute('terminals')

router.use(async (req, res, next) => {
  try {
    const user = req.user

    const { method, params: body } = req.body

    const isAdmin = req.user.isAdmin = await authorization.isAdmin(user)

    terminals.ensureTerminalAllowed({ method, isAdmin, body })
    next()
  } catch (err) {
    next(err)
  }
})

router.route('/')
  .all(metricsMiddleware)
  .post(async (req, res, next) => {
    try {
      const user = req.user

      const { method, params: body } = req.body

      let func
      switch (method) {
        case 'create':
          func = terminals.create
          break
        case 'fetch':
          func = terminals.fetch
          break
        case 'list':
          func = terminals.list
          break
        case 'config':
          func = terminals.config
          break
        case 'remove':
          func = terminals.remove
          break
        case 'heartbeat':
          func = terminals.heartbeat
          break
        case 'listProjectTerminalShortcuts':
          func = terminals.listProjectTerminalShortcuts
          break
        default:
          throw new UnprocessableEntity(`${method} not allowed for terminals`)
      }
      res.send(await func({ user, body }))
    } catch (err) {
      next(err)
    }
  })
