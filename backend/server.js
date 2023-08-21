//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const app = require('./lib/app')
const metricsApp = require('@gardener-dashboard/monitor')

const createServer = require('./lib/server')

createServer(app, metricsApp).run()
