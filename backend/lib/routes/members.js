//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const express = require('express')
const { members } = require('../services')
const { UnprocessableEntity } = require('http-errors')

const router = module.exports = express.Router({
  mergeParams: true
})

router.route('/')
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
          await members.resetServiceAccount({ user, namespace, name })
          res.status(204).end()
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
