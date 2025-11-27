//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import express from 'express'
import services from '../services/index.js'
import httpErrors from 'http-errors'
import { metricsRoute } from '../middleware.js'
const { members } = services
const { UnprocessableEntity } = httpErrors

const router = express.Router({
  mergeParams: true,
})

const metricsMiddleware = metricsRoute('members')

router.route('/')
  .all(metricsMiddleware)
  .get(async (req, res, next) => {
    try {
      const user = req.user
      const namespace = req.params.namespace
      res.send(await members.list({ user, namespace }))
    } catch (err) {
      next(err)
    }
  })
  .post(async (req, res, next) => {
    try {
      const user = req.user
      const namespace = req.params.namespace
      const body = req.body
      res.send(await members.create({ user, namespace, body }))
    } catch (err) {
      next(err)
    }
  })

router.route('/:name')
  .all(metricsMiddleware)
  .get(async (req, res, next) => {
    try {
      const user = req.user
      const namespace = req.params.namespace
      const name = req.params.name
      res.send(await members.get({ user, namespace, name }))
    } catch (err) {
      next(err)
    }
  })
  .put(async (req, res, next) => {
    try {
      const user = req.user
      const namespace = req.params.namespace
      const name = req.params.name
      const body = req.body
      res.send(await members.update({ user, namespace, name, body }))
    } catch (err) {
      next(err)
    }
  })
  .post(async (req, res, next) => {
    try {
      const user = req.user
      const { namespace, name } = req.params
      const { method } = req.body

      switch (method) {
        case 'resetServiceAccount':
          res.send(await members.resetServiceAccount({ user, namespace, name }))
          break
        default:
          throw new UnprocessableEntity(`${method} not allowed for members`)
      }
    } catch (err) {
      next(err)
    }
  })
  .delete(async (req, res, next) => {
    try {
      const user = req.user
      const namespace = req.params.namespace
      const name = req.params.name
      res.send(await members.remove({ user, namespace, name }))
    } catch (err) {
      next(err)
    }
  })

export default router
