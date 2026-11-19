//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import config from '../config/index.js'
import { globalLogger } from '@gardener-dashboard/logger'
const { logLevel, logFormat, logHttpRequestBody } = config

globalLogger.setLogLevel(logLevel)
globalLogger.setLogFormat(logFormat)
globalLogger.setLogHttpRequestBody(logHttpRequestBody)

export default globalLogger
