//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const express = require('express')
const _ = require('lodash')
const config = require('./config')
const { resolve, join } = require('path')
const logger = require('./logger')
const { notFound, renderError, historyFallback, noCache } = require('./middleware')
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
const gitHubRepoUrl = _.get(config, 'frontend.ticket.gitHubRepoUrl')
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
app.use(noCache())
app.use('/auth', auth.router)
app.use('/api', api.router)
app.use('/webhook', githubWebhook.router)
app.get('/config.json', api.frontendConfig(config))

app.use(helmet.xssFilter())
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ['\'self\''],
    connectSrc,
    styleSrc: ['\'self\'', '\'unsafe-inline\''],
    fontSrc: ['\'self\'', 'data:'],
    imgSrc,
    scriptSrc: ['\'self\'', '\'unsafe-eval\''],
    frameAncestors: ['\'none\'']
  }
}))
app.use(helmet.referrerPolicy({
  policy: 'same-origin'
}))

app.use(express.static(PUBLIC_DIRNAME))
app.use(['/css', '/fonts', '/img', '/js'], notFound)

app.use(helmet.frameguard({
  action: 'deny'
}))
app.use(historyFallback(INDEX_FILENAME))

app.use(renderError)

module.exports = app
