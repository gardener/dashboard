//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import express from 'express'
import services from '../services/index.mjs'
import httpErrors from 'http-errors'
import { metricsRoute } from '../middleware.mjs'
const { terminals } = services
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
      res.send(await terminals.invokeTerminalMethod({ user, method, body }))
    } catch (err) {
      next(err)
    }
  })

export default router
