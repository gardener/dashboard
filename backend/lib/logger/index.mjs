//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import config from '../config/index.js'
import { globalLogger } from '@gardener-dashboard/logger'
const { logLevel, logHttpRequestBody } = config

globalLogger.setLogLevel(logLevel)
globalLogger.setLogHttpRequestBody(logHttpRequestBody)

export default globalLogger
