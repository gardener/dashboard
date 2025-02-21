//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//
import express from 'express'
import bodyParser from 'body-parser'
import cookieParser from 'cookie-parser'
import zlib from 'zlib'
import compression from 'compression'
import config from './config/index.js'
import routes from './routes/index.js'
import createHooks from './hooks.js'
import { authenticate } from './security/index.js'
import kubeClient from '@gardener-dashboard/kube-client/lib/index.js'
import { notFound, sendError, requestLogger } from './middleware.js'
import kubeMonitor from '@gardener-dashboard/monitor/lib/index.js'

const { monitorResponseTimes } = kubeMonitor
const { createClient } = kubeClient

const hooks = createHooks()

// configure router
const router = express.Router()
router.use(compression({
  threshold: 8192,
  level: zlib.constants.Z_DEFAULT_COMPRESSION,
}))
router.use(requestLogger)
router.use(monitorResponseTimes())
router.use(cookieParser())
router.use(bodyParser.json({
  limit: config.maxRequestBodySize,
}))
router.use(authenticate({ createClient }))

for (const [key, value] of Object.entries(routes)) {
  router.use(key, value)
}

router.use(notFound)
router.use(sendError)

export {
  hooks,
  router,
}
