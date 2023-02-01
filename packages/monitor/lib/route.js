//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const express = require('express')
const { getMetrics, contentType } = require('./metrics')

const router = express.Router()

router.route('/')
  .get(async (req, res, next) => {
    try {
      res
        .set({
          'cache-control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'content-type': contentType
        })
        .send(await getMetrics())
    } catch (err) {
      next(err)
    }
  })
  .all((req, res) => {
    res
      .set('allow', 'GET')
      .sendStatus(405)
  })

module.exports = router
