//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import express from 'express'
import services from '../services/index.js'
import httpErrors from 'http-errors'
import { metricsRoute } from '../middleware.js'
const { terminals, authorization } = services
const { UnprocessableEntity } = httpErrors

const router = express.Router({
  mergeParams: true,
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

      let terminalOperation
      switch (method) {
        case 'create':
          terminalOperation = terminals.create
          break
        case 'fetch':
          terminalOperation = terminals.fetch
          break
        case 'list':
          terminalOperation = terminals.list
          break
        case 'config':
          terminalOperation = terminals.config
          break
        case 'remove':
          terminalOperation = terminals.remove
          break
        case 'heartbeat':
          terminalOperation = terminals.heartbeat
          break
        case 'listProjectTerminalShortcuts':
          terminalOperation = terminals.listProjectTerminalShortcuts
          break
        default:
          throw new UnprocessableEntity(`${method} not allowed for terminals`)
      }
      res.send(await terminalOperation.call(terminals, { user, body }))
    } catch (err) {
      next(err)
    }
  })

export default router
