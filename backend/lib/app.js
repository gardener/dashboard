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

const express = require('express')
const _ = require('lodash')
const config = require('./config')
const { resolve, join } = require('path')
const logger = require('./logger')
const { notFound, renderError, historyFallback } = require('./middleware')
const helmet = require('helmet')
const api = require('./api')
const auth = require('./auth')
const githubWebhook = require('./github/webhook')
const { healthCheck } = require('./healthz')
const port = config.port
const periodSeconds = _.get(config, 'readinessProbe.periodSeconds', 10)

// resolve pathnames
const PUBLIC_DIRNAME = resolve(join(__dirname, '..', 'public'))
const INDEX_FILENAME = join(PUBLIC_DIRNAME, 'index.html')
// csp sources
const connectSrc = ['\'self\'', 'wss:', 'ws:']
const imgSrc = ['\'self\'', 'data:', 'https://www.gravatar.com']
const gitHubRepoUrl = _.get(config, 'frontend.gitHubRepoUrl')
if (gitHubRepoUrl) {
  const url = new URL(gitHubRepoUrl)
  imgSrc.push(url.origin)
  url.hostname = 'avatars.' + url.hostname
  imgSrc.push(url.origin)
}

// configure app
const app = express()
app.set('port', port)
app.set('logger', logger)
app.set('healthCheck', healthCheck)
app.set('periodSeconds ', periodSeconds)
app.set('synchronizer', api.synchronizer)
app.set('io', api.io)
app.set('trust proxy', 1)
app.set('etag', false)
app.set('x-powered-by', false)

app.use(helmet.dnsPrefetchControl())
app.use(helmet.permittedCrossDomainPolicies())
app.use(helmet.noSniff())
app.use(helmet.hsts())
app.use('/auth', auth.router)
app.use('/api', api.router)
app.use('/webhook', githubWebhook.router)
app.get('/config.json', api.frontendConfig)

app.use(helmet.xssFilter())
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ['\'self\''],
    connectSrc,
    styleSrc: ['\'self\'', '\'unsafe-inline\'', 'https://fonts.googleapis.com', 'https://cdn.materialdesignicons.com'],
    fontSrc: ['\'self\'', 'https://fonts.gstatic.com', 'https://cdn.materialdesignicons.com'],
    imgSrc,
    scriptSrc: ['\'self\'', '\'unsafe-eval\''],
    frameAncestors: ['\'none\'']
  }
}))
app.use(helmet.referrerPolicy({
  policy: 'same-origin'
}))

app.use(express.static(PUBLIC_DIRNAME))

app.use(helmet.frameguard({
  action: 'deny'
}))
app.use(helmet.noCache())
app.use(historyFallback(INDEX_FILENAME))

app.use(notFound)
app.use(renderError)

module.exports = app
