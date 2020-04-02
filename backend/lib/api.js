//
// Copyright (c) 2019 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
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
const { createClient, dashboardClient } = require('./kubernetes-client')
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
