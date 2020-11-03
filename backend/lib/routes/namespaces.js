//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const express = require('express')
const { projects } = require('../services')

const router = module.exports = express.Router()

router.route('/')
  .get(async (req, res, next) => {
    try {
      const user = req.user
      const qs = req.query
      res.send(await projects.list({ user, qs }))
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

router.route('/:namespace')
  .get(async (req, res, next) => {
    try {
      const user = req.user
      const name = req.params.namespace
      res.send(await projects.read({ user, name }))
    } catch (err) {
      next(err)
    }
  })
  .put(async (req, res, next) => {
    try {
      const user = req.user
      const name = req.params.namespace
      const body = req.body
      res.send(await projects.patch({ user, name, body }))
    } catch (err) {
      next(err)
    }
  })
  .patch(async (req, res, next) => {
    try {
      const user = req.user
      const name = req.params.namespace
      const body = req.body
      res.send(await projects.patch({ user, name, body }))
    } catch (err) {
      next(err)
    }
  })
  .delete(async (req, res, next) => {
    try {
      const user = req.user
      const name = req.params.namespace
      res.send(await projects.remove({ user, name }))
    } catch (err) {
      next(err)
    }
  })
