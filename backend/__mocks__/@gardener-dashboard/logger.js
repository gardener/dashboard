//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { Logger, globalLogger } = jest.createMockFromModule('@gardener-dashboard/logger')

globalLogger.console = {
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}

module.exports = {
  Logger,
  globalLogger,
}
