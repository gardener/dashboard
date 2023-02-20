//
// SPDX-FileCopyrightText: 2022 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { logLevel } = require('./config')
const { globalLogger } = require('@gardener-dashboard/logger')

globalLogger.setLogLevel(logLevel)

module.exports = globalLogger
