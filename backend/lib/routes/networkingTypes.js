//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const express = require('express')
const { controllerregistrations } = require('../services')

const router = module.exports = express.Router()

router.route('/')
  .get(async (req, res, next) => {
    try {
      res.send(await controllerregistrations.listNetworkingTypes())
    } catch (err) {
      next(err)
    }
  })
