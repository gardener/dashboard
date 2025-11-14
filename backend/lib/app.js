//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import express from 'express'
import expressStaticGzip from 'express-static-gzip'
import _ from 'lodash-es'
import config from './config/index.js'
import {
  resolve,
  join,
  dirname,
} from 'path'
import { fileURLToPath } from 'url'
import { existsSync } from 'fs'
import logger from './logger/index.js'
import {
  notFound,
  renderError,
  historyFallback,
} from './middleware.js'
import helmet from 'helmet'
import {
  router as apiRouter,
  hooks as apiHooks,
} from './api.js'
import { router as authRouter } from './auth.js'
import { router as githubWebhookRouter } from './github/webhook/index.js'
import { healthCheck } from './healthz/index.js'

const { port, metricsPort } = config
const periodSeconds = config.readinessProbe?.periodSeconds || 10

// protect against Prototype Pollution vulnerabilities
for (const ctor of [Object, Function, Array, String, Number, Boolean]) {
  Object.freeze(ctor)
  Object.freeze(ctor.prototype)
}

// resolve pathnames
const __dirname = dirname(fileURLToPath(import.meta.url))
const PUBLIC_DIRNAME = resolve(join(__dirname, '..', 'public'))
const INDEX_FILENAME = join(PUBLIC_DIRNAME, 'index.html')
const ASSETS_PATH = '/assets' // compiled static files with hash in filename
const ASSETS_DIRNAME = join(PUBLIC_DIRNAME, 'assets') // assets provided by confguration (configmap volume mount)
const DYNAMIC_ASSETS_PATH = '/static/assets' // content can be overwritten by configuration - so actually dynamic, keep old path for compatibility reasons
const DYNAMIC_ASSETS_DIRNAME = join(PUBLIC_DIRNAME, 'static', 'custom-assets') // assets provided by confguration (configmap volume mount)

// csp sources
const connectSrc = _.get(config, ['contentSecurityPolicy', 'connectSrc'], ['\'self\''])
const imgSrc = ['\'self\'', 'data:', 'https://www.gravatar.com']
const gitHubRepoUrl = _.get(config, ['frontend', 'ticket', 'gitHubRepoUrl'])
if (gitHubRepoUrl) {
  const url = new URL(gitHubRepoUrl)
  const gitHubHostname = url.hostname
  url.hostname = 'avatars.' + gitHubHostname
  imgSrc.push(url.origin)
  url.hostname = 'media.' + gitHubHostname
  imgSrc.push(url.origin)
}

// configure app
const app = express()
app.set('port', port)
app.set('metricsPort', metricsPort)
app.set('logger', logger)
app.set('healthCheck', healthCheck)
app.set('periodSeconds', periodSeconds)
app.set('hooks', apiHooks)
app.set('trust proxy', 1)
app.set('etag', false)
app.set('x-powered-by', false)

app.use(helmet.xDnsPrefetchControl())
app.use(helmet.xPermittedCrossDomainPolicies())
app.use(helmet.xContentTypeOptions())
if (process.env.NODE_ENV !== 'development') {
  app.use(helmet.strictTransportSecurity())
}
app.use('/auth', authRouter)
app.use('/webhook', githubWebhookRouter)
app.use('/api', apiRouter)

app.use(helmet.xXssProtection())
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ['\'self\''],
    connectSrc,
    styleSrc: ['\'self\'', '\'unsafe-inline\''],
    fontSrc: ['\'self\'', 'data:'],
    imgSrc,
    scriptSrc: ['\'self\'', '\'unsafe-eval\''],
    frameAncestors: ['\'self\''],
  },
}))
app.use(helmet.referrerPolicy({
  policy: 'same-origin',
}))

if (existsSync(DYNAMIC_ASSETS_DIRNAME)) {
  logger.debug(`Serving dynamic assets from ${DYNAMIC_ASSETS_DIRNAME}`)
  app.use(DYNAMIC_ASSETS_PATH, expressStaticGzip(DYNAMIC_ASSETS_DIRNAME, {
    enableBrotli: true,
    orderPreference: ['br'],
    serveStatic: {
      etag: true,
      immutable: false,
    },
  }))
}

app.use(ASSETS_PATH, expressStaticGzip(ASSETS_DIRNAME, {
  enableBrotli: true,
  orderPreference: ['br'],
  serveStatic: {
    immutable: true,
    maxAge: '1 Week',
    etag: true,
  },
}))

app.use(expressStaticGzip(PUBLIC_DIRNAME, {
  enableBrotli: true,
  orderPreference: ['br'],
  serveStatic: {
    etag: true,
    immutable: false,
  },
}))

app.use([ASSETS_PATH, DYNAMIC_ASSETS_PATH], notFound)

app.use(helmet.xFrameOptions({
  action: 'deny',
}))
app.use(historyFallback(INDEX_FILENAME))

app.use(renderError)

export default app
