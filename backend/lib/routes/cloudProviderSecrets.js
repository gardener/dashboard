//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const express = require('express')
const { cloudProviderSecrets } = require('../services')
const { metricsRoute } = require('../middleware')

const router = module.exports = express.Router({
  mergeParams: true
})

const metricsMiddleware = metricsRoute('cloudprovidersecrets')

router.route('/')
  .all(metricsMiddleware)
  .get(async (req, res, next) => {
    try {
      const user = req.user
      const namespace = req.params.namespace
      res.send(await cloudProviderSecrets.list({ user, namespace }))
    } catch (err) {
      next(err)
    }
  })
  .post(async (req, res, next) => {
    try {
      const user = req.user
      const namespace = req.params.namespace
      const body = req.body
      res.send(await cloudProviderSecrets.create({ user, namespace, body }))
    } catch (err) {
      next(err)
    }
  })

router.route('/:name')
  .put(async (req, res, next) => {
    try {
      const user = req.user
      const { namespace, name } = req.params
      const body = req.body
      res.send(await cloudProviderSecrets.patch({ user, namespace, name, body }))
    } catch (err) {
      next(err)
    }
  })
  .delete(async (req, res, next) => {
    try {
      const user = req.user
      const { namespace, name } = req.params
      res.send(await cloudProviderSecrets.remove({ user, namespace, name }))
    } catch (err) {
      next(err)
    }
  })
