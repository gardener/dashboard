//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const _ = require('lodash')
const morgan = require('morgan')
const express = require('express')
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser')
const logger = require('./logger')
const routes = require('./routes')
const { authenticate } = require('./security')
const { createClient, dashboardClient } = require('@gardener-dashboard/kube-client')
const cache = require('./cache')
const io = require('./io')
const { frontendConfig, notFound, sendError } = require('./middleware')

// configure router
const router = express.Router()

// cache synchronizer
const synchronizer = () => cache.synchronize(dashboardClient)

router.use(morgan('common', logger))
router.use(cookieParser())
router.use(bodyParser.json())
router.use(authenticate({ createClient }))
_.each(routes, (value, key) => router.use(key, value))
router.use(notFound)
router.use(sendError)

// exports
module.exports = {
  router,
  synchronizer,
  io,
  frontendConfig
}
