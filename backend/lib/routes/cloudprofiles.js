//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const express = require('express')
const { cloudprofiles } = require('../services')

const router = module.exports = express.Router()

router.route('/')
  .get(async (req, res, next) => {
    try {
      const user = req.user
      res.send(await cloudprofiles.list({ user }))
    } catch (err) {
      next(err)
    }
  })
