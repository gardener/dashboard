//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const express = require('express')
const { namespaces } = require('../services')
const { metricsRoute } = require('../middleware')

const router = module.exports = express.Router()

const metricsMiddleware = metricsRoute('namespaces')

router.route('/')
  .all(metricsMiddleware)
  .get(async (req, res, next) => {
    try {
      const user = req.user
      res.send(await namespaces.list({ user }))
    } catch (err) {
      next(err)
    }
  })
  .post(async (req, res, next) => {
    try {
      const user = req.user
      const body = req.body
      res.send(await namespaces.create({ user, body }))
    } catch (err) {
      next(err)
    }
  })

router.route('/:namespace')
  .all(metricsMiddleware)
  .get(async (req, res, next) => {
    try {
      const user = req.user
      const name = req.params.namespace
      res.send(await namespaces.read({ user, name }))
    } catch (err) {
      next(err)
    }
  })
  .put(async (req, res, next) => {
    try {
      const user = req.user
      const name = req.params.namespace
      const body = req.body
      res.send(await namespaces.patch({ user, name, body }))
    } catch (err) {
      next(err)
    }
  })
  .patch(async (req, res, next) => {
    try {
      const user = req.user
      const name = req.params.namespace
      const body = req.body
      res.send(await namespaces.patch({ user, name, body }))
    } catch (err) {
      next(err)
    }
  })
  .delete(async (req, res, next) => {
    try {
      const user = req.user
      const name = req.params.namespace
      res.send(await namespaces.remove({ user, name }))
    } catch (err) {
      next(err)
    }
  })
