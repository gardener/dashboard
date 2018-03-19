//
// Copyright (c) 2018 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file
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

const express = require('express')
const history = require('connect-history-api-fallback')
const config = require('./config')
const { serveStatic } = require('./utils')
const logger = require('./logger')
const { notFound, renderError } = require('./middleware')
const api = require('./api')
const githubWebhook = require('./github/webhook')
const port = config.port

// configure app
const app = express()
app.set('port', port)
app.set('logger', logger)
app.set('io', api.io)
app.set('trust proxy', 1)
app.use('/static', serveStatic('static', true))
app.use('/api', api.router)
app.use('/webhook', githubWebhook.router)
app.use('/config.json', api.frontendConfig)
app.use(history())
app.use(serveStatic('public', true))
app.use(notFound)
app.use(renderError)

module.exports = app
