//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import Logger from './Logger.js'

const globalLogger = new Logger()
export {
  Logger,
  globalLogger,
}
