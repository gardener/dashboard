//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const express = require('express')
const { seeds } = require('../services')

const router = module.exports = express.Router()

router.route('/')
  .get(async (req, res, next) => {
    try {
      const user = req.user
      res.send(await seeds.list({ user }))
    } catch (err) {
      next(err)
    }
  })
