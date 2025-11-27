//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import express from 'express'
import services from '../services/index.js'
import { metricsRoute } from '../middleware.js'
const { cloudprofiles } = services

const router = express.Router()

const metricsMiddleware = metricsRoute('cloudprofiles')

router.route('/')
  .all(metricsMiddleware)
  .get(async (req, res, next) => {
    try {
      const user = req.user
      res.send(await cloudprofiles.list({ user }))
    } catch (err) {
      next(err)
    }
  })

export default router
