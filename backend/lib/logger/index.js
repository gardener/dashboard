//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { logLevel, logHttpRequestBody } = require('../config')
const { globalLogger } = require('@gardener-dashboard/logger')

globalLogger.setLogLevel(logLevel)
globalLogger.setLogHttpRequestBody(logHttpRequestBody)

module.exports = globalLogger
