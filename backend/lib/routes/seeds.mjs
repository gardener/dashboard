//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import express from 'express'
import services from '../services/index.mjs'
import { metricsRoute } from '../middleware.js'
const { seeds } = services

const router = express.Router()

const metricsMiddleware = metricsRoute('seeds')

router.route('/')
  .all(metricsMiddleware)
  .get(async (req, res, next) => {
    try {
      const user = req.user
      res.send(await seeds.list({ user }))
    } catch (err) {
      next(err)
    }
  })

export default router
