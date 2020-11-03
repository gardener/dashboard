//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const express = require('express')
const { terminals, authorization } = require('../services')
const _ = require('lodash')

const router = module.exports = express.Router({
  mergeParams: true
})

router.use(async (req, res, next) => {
  try {
    const user = req.user

    const { method, params: body } = req.body

    const isAdmin = req.user.isAdmin = await authorization.isAdmin(user)

    terminals.ensureTerminalAllowed({ method, isAdmin, body })
    next()
  } catch (err) {
    next(err)
  }
})

router.route('/')
  .post(async (req, res, next) => {
    try {
      const user = req.user

      const { method, params: body } = req.body

      if (!_.includes(['create', 'fetch', 'list', 'config', 'remove', 'heartbeat', 'listProjectTerminalShortcuts'], method)) {
        throw new Error(`${method} not allowed for terminals`)
      }
      res.send(await terminals[method]({ user, body }))
    } catch (err) {
      next(err)
    }
  })
