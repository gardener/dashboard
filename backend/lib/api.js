//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const morgan = require('morgan')
const express = require('express')
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser')
const logger = require('./logger')
const routes = require('./routes')
const hooks = require('./hooks')()
const { authenticate } = require('./security')
const { createClient } = require('@gardener-dashboard/kube-client')
const { frontendConfig, notFound, sendError } = require('./middleware')

// configure router
const router = express.Router()

router.use(morgan('common', logger))
router.use(cookieParser())
router.use(bodyParser.json())
router.use(authenticate({ createClient }))
for (const [key, value] of Object.entries(routes)) {
  router.use(key, value)
}
router.use(notFound)
router.use(sendError)

// exports
module.exports = {
  router,
  hooks,
  frontendConfig
}
