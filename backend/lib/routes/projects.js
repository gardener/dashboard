//
// SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const express = require('express')
const { projects } = require('../services')
const { metricsRoute } = require('../middleware')

const router = module.exports = express.Router()

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
