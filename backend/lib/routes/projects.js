//
// SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import express from 'express'
import services from '../services/index.js'
import { metricsRoute } from '../middleware.js'
const { projects } = services

const router = express.Router()

const metricsMiddleware = metricsRoute('project')

router.route('/')
  .all(metricsMiddleware)
  .get(async (req, res, next) => {
    try {
      const user = req.user
      res.send(await projects.list({ user }))
    } catch (err) {
      next(err)
    }
  })
  .post(async (req, res, next) => {
    try {
      const user = req.user
      const body = req.body
      res.send(await projects.create({ user, body }))
    } catch (err) {
      next(err)
    }
  })

router.route('/:project')
  .all(metricsMiddleware)
  .get(async (req, res, next) => {
    try {
      const user = req.user
      const name = req.params.project
      res.send(await projects.read({ user, name }))
    } catch (err) {
      next(err)
    }
  })
  .put(async (req, res, next) => {
    try {
      const user = req.user
      const name = req.params.project
      const body = req.body
      res.send(await projects.patch({ user, name, body }))
    } catch (err) {
      next(err)
    }
  })
  .patch(async (req, res, next) => {
    try {
      const user = req.user
      const name = req.params.project
      const body = req.body
      res.send(await projects.patch({ user, name, body }))
    } catch (err) {
      next(err)
    }
  })
  .delete(async (req, res, next) => {
    try {
      const user = req.user
      const name = req.params.project
      res.send(await projects.remove({ user, name }))
    } catch (err) {
      next(err)
    }
  })

export default router
