//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const express = require('express')
const { infrastructureSecrets } = require('../services')

const router = module.exports = express.Router({
  mergeParams: true
})

router.route('/')
  .get(async (req, res, next) => {
    try {
      const user = req.user
      const namespace = req.params.namespace
      res.send(await infrastructureSecrets.list({ user, namespace }))
    } catch (err) {
      next(err)
    }
  })
  .post(async (req, res, next) => {
    try {
      const user = req.user
      const namespace = req.params.namespace
      const body = req.body
      res.send(await infrastructureSecrets.create({ user, namespace, body }))
    } catch (err) {
      next(err)
    }
  })

router.route('/:name')
  .put(async (req, res, next) => {
    try {
      const user = req.user
      const namespace = req.params.namespace
      const bindingName = req.params.name
      const body = req.body
      res.send(await infrastructureSecrets.patch({ user, namespace, bindingName, body }))
    } catch (err) {
      next(err)
    }
  })
  .delete(async (req, res, next) => {
    try {
      const user = req.user
      const namespace = req.params.namespace
      const bindingName = req.params.name
      res.send(await infrastructureSecrets.remove({ user, namespace, bindingName }))
    } catch (err) {
      next(err)
    }
  })
