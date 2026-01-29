//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import express from 'express'
import services from '../services/index.js'
import { metricsRoute } from '../middleware.js'
const { cloudprofiles } = services

const router = express.Router({ mergeParams: true })

const metricsMiddleware = metricsRoute('namespacedcloudprofiles')

router.route('/')
  .all(metricsMiddleware)
  .get(async (req, res, next) => {
    try {
      const user = req.user
      const namespace = req.params.namespace
      res.send(await cloudprofiles.listForNamespace({ user, namespace }))
    } catch (err) {
      next(err)
    }
  })

export default router
