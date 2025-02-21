//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { app } from './lib/app.mjs'
import metricsApp from '@gardener-dashboard/monitor/lib/index.js'

import { createServer } from './lib/server.mjs'

createServer(app, metricsApp).run()
