//
// SPDX-FileCopyrightText: 2022 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const express = require('express')
const { resourceQuotas } = require('../services')

const router = module.exports = express.Router({
  mergeParams: true
})
router.route('/')
  .get(async (req, res, next) => {
    try {
      const user = req.user
      const namespace = req.params.namespace

      res.send(await resourceQuotas.list({ user, namespace }))
    } catch (err) {
      next(err)
    }
  })
