//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const app = require('./lib/app')
const config = require('./lib/config')
const { createApp } = require('@gardener-dashboard/monitor')

const createServer = require('./lib/server')

createServer(app).run()
const monitorApp = createApp({
  port: config.metricsPort,
  periodSeconds: config.readinessProbe?.periodSeconds || 10
})
createServer(monitorApp).run()
