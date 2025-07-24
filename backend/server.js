// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import app from './lib/app.js'
import metricsApp from '@gardener-dashboard/monitor'
import createServer from './lib/server.js'

createServer(app, metricsApp).run()
