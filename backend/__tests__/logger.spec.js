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
  async function importLogger (config, resetModules = true) {
    if (resetModules) {
      vi.resetModules()
    }
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
    vi.resetModules()
    const { globalLogger } = await import('@gardener-dashboard/logger')
    const logger = await importLogger({ logLevel: 'info', logFormat: 'json', logHttpRequestBody: false }, false)
    expect(logger).toBe(globalLogger)
    expect(globalLogger.logFormat).toBe('json')
    logger.setLogFormat('text')
    expect(globalLogger.logFormat).toBe('text')
  })

  it('should use the text format', async function () {
    const logger = await importLogger({ logLevel: 'info', logFormat: 'text', logHttpRequestBody: false })
    expect(logger.logFormat).toBe('text')
  })
})
