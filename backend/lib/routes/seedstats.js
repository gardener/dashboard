//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import express from 'express'
import services from '../services/index.js'
import { metricsRoute } from '../middleware.js'

const { seedstats } = services

const router = express.Router()

const metricsMiddleware = metricsRoute('seedstats')

router.route('/')
  .all(metricsMiddleware)
  .get(async (req, res, next) => {
    try {
      const user = req.user
      const unhealthyFilterMask = req.query.unhealthyFilterMask
      res.send(await seedstats.list({ user, unhealthyFilterMask }))
    } catch (err) {
      next(err)
    }
  })

router.route('/:name')
  .all(metricsMiddleware)
  .get(async (req, res, next) => {
    try {
      const user = req.user
      const name = req.params.name
      const unhealthyFilterMask = req.query.unhealthyFilterMask
      res.send(await seedstats.read({ user, name, unhealthyFilterMask }))
    } catch (err) {
      next(err)
    }
  })

export default router
