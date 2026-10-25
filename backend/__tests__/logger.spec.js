//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
} from 'vitest'

describe('logger', function () {
  async function importLogger (config) {
    vi.resetModules()
    vi.doMock('../lib/config/index.js', () => ({ default: config }))
    const { default: logger } = await import('../lib/logger/index.js')
    return logger
  }

  beforeEach(() => {
    vi.doUnmock('../lib/config/index.js')
  })

  it('should switch the global logger to the configured format', async function () {
    const logger = await importLogger({ logLevel: 'info', logFormat: 'json', logHttpRequestBody: false })
    expect(logger.logFormat).toBe('json')
    expect(logger.logLevel).toBe(logger.LEVELS.info)
  })

  it('should keep the global logger instance when switching the format', async function () {
    const { globalLogger } = await import('@gardener-dashboard/logger')
    const logger = await importLogger({ logLevel: 'info', logFormat: 'json', logHttpRequestBody: false })
    const { globalLogger: sameLogger } = await import('@gardener-dashboard/logger')
    expect(logger).toBe(sameLogger)
    expect(sameLogger.logFormat).toBe('json')
    sameLogger.setLogFormat('text')
    expect(globalLogger.logFormat).toBe('text')
  })

  it('should use the text format', async function () {
    const logger = await importLogger({ logLevel: 'info', logFormat: 'text', logHttpRequestBody: false })
    expect(logger.logFormat).toBe('text')
  })
})
