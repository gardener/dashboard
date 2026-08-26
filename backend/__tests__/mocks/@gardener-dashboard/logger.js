//
// SPDX-FileCopyrightText: Copyright Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import { vi } from 'vitest'

const loggerActual = await vi.importActual('@gardener-dashboard/logger')
const { Logger, globalLogger } = loggerActual

globalLogger.console = {
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}

const mockModule = {
  ...loggerActual,
  Logger,
  globalLogger,
}

export default mockModule
export {
  Logger,
  globalLogger,
}
