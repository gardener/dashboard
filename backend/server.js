//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const app = require('./lib/app')
const createServer = require('./lib/server')
createServer(app).run()
