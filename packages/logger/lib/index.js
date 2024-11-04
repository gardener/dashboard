//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const Logger = require('./Logger')

module.exports = {
  Logger,
  globalLogger: new Logger(),
}
