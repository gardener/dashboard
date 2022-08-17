//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const express = require('express')
const { resourceQuotas } = require('../services')

const router = module.exports = express.Router({
  mergeParams: true
})
router.route('/:name')
  .get(async (req, res, next) => {
    try {
      const user = req.user
      const namespace = req.params.namespace
      const name = req.params.name
      
      res.send(await resourceQuotas.read({ user, namespace, name }))
    } catch (err) {
      next(err)
    }
  })
