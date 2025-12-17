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
const PUBLIC_FS_PATH = resolve(join(__dirname, '..', 'public'))
const INDEX_FILENAME = join(PUBLIC_FS_PATH, 'index.html')
// hashed frontend build assets (cacheable/immutable)
const BUILD_ASSETS_URL_PATH = '/assets'
const BUILD_ASSETS_FS_PATH = join(PUBLIC_FS_PATH, 'assets')
// non-hashed static/branding assets (logo, favicon, etc.)
const STATIC_ASSETS_URL_PATH = '/static/assets'
const STATIC_ASSETS_OVERRIDE_FS_PATH = join(PUBLIC_FS_PATH, 'static', 'custom-assets') // custom assets override from ConfigMap

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
    scriptSrc: ['\'self\''],
    frameAncestors: ['\'self\''],
  },
}))
app.use(helmet.referrerPolicy({
  policy: 'same-origin',
}))

if (existsSync(STATIC_ASSETS_OVERRIDE_FS_PATH)) {
  logger.debug(`Serving static asset overrides from ${STATIC_ASSETS_OVERRIDE_FS_PATH}`)
  app.use(STATIC_ASSETS_URL_PATH, expressStaticGzip(STATIC_ASSETS_OVERRIDE_FS_PATH, {
    enableBrotli: true,
    orderPreference: ['br'],
    serveStatic: {
      etag: true,
      immutable: false,
    },
  }))
}

app.use(BUILD_ASSETS_URL_PATH, expressStaticGzip(BUILD_ASSETS_FS_PATH, {
  enableBrotli: true,
  orderPreference: ['br'],
  serveStatic: {
    etag: true,
    immutable: true,
    maxAge: '1 Week',
  },
}))

app.use(expressStaticGzip(PUBLIC_FS_PATH, {
  enableBrotli: true,
  orderPreference: ['br'],
  serveStatic: {
    etag: true,
    immutable: false,
  },
}))

app.use([BUILD_ASSETS_URL_PATH, STATIC_ASSETS_URL_PATH], notFound)

app.use(helmet.xFrameOptions({
  action: 'deny',
}))
app.use(historyFallback(INDEX_FILENAME))

app.use(renderError)

export default app
