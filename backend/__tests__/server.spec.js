//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  describe,
  it,
  expect,
  vi,
  beforeAll,
  afterAll,
  beforeEach,
} from 'vitest'
import http from 'http'
import https from 'https'
import terminus from '@godaddy/terminus'
import metricsApp from '@gardener-dashboard/monitor'
import createServer from '../lib/server.js'

function createApplication (port, metricsPort, { tls } = {}) {
  const app = (req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' })
    res.end('ok', 'utf8')
  }
  const map = new Map()
  map.set('port', port)
  map.set('metricsPort', metricsPort)
  map.set('tls', tls)
  map.set('periodSeconds', 1)
  map.set('healthCheck', vi.fn())
  map.set('hooks', {
    cleanup: vi.fn(() => Promise.resolve()),
    beforeListen: vi.fn(() => Promise.resolve()),
  })
  map.set('logger', {
    log: vi.fn(),
    debug (...args) {
      this.log('debug', ...args)
    },
    warn (...args) {
      this.log('warn', ...args)
    },
    error (...args) {
      this.log('error', ...args)
    },
    info (...args) {
      this.log('info', ...args)
    },
  })
  app.get = Map.prototype.get.bind(map)
  return app
}

describe('server', () => {
  const port = 1234
  const metricsPort = 5678
  const mockServer = {
    listen: vi.fn((_, callback) => setImmediate(callback)),
  }
  const mockTerminus = {}
  let app
  let hooks
  let logger
  let healthCheck
  let server
  let mockCreateServer
  let mockCreateTerminus

  let setTimeoutSpy

  beforeAll(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true, toFake: ['setTimeout', 'clearTimeout'] })
    setTimeoutSpy = vi.spyOn(global, 'setTimeout')
  })

  afterAll(() => {
    vi.useRealTimers()
  })

  beforeEach(() => {
    setTimeoutSpy.mockClear()
    mockCreateServer = vi.spyOn(http, 'createServer').mockReturnValue(mockServer)
    mockCreateTerminus = vi.spyOn(terminus, 'createTerminus').mockReturnValue(mockTerminus)
    app = createApplication(port, metricsPort)
    hooks = app.get('hooks')
    logger = app.get('logger')
    healthCheck = app.get('healthCheck')
    server = createServer(app, metricsApp)
  })

  it('should create and run the server', async () => {
    expect(mockCreateServer).toHaveBeenCalledTimes(2)
    expect(mockCreateServer.mock.calls[0]).toHaveLength(1)
    expect(mockCreateServer.mock.calls[0][0]).toBe(app)
    expect(mockCreateServer.mock.calls[1]).toHaveLength(1)
    expect(mockCreateServer.mock.calls[1][0]).toBe(metricsApp)
    expect(mockCreateTerminus).toHaveBeenCalledTimes(1)
    expect(mockCreateTerminus.mock.calls[0]).toHaveLength(2)
    expect(mockCreateTerminus.mock.calls[0][0]).toBe(mockServer)
    const terminusOptions = mockCreateTerminus.mock.calls[0][1]
    expect(terminusOptions.beforeShutdown).toEqual(expect.any(Function))
    expect(terminusOptions.onSignal).toEqual(expect.any(Function))
    await server.run()
    expect(hooks.beforeListen).toHaveBeenCalledTimes(1)
    expect(hooks.beforeListen.mock.calls[0]).toHaveLength(1)
    expect(hooks.beforeListen.mock.calls[0][0]).toEqual(mockServer)
    expect(logger.log.mock.calls).toEqual([
      ['info', 'Metrics server listening on port %d', metricsPort],
      ['debug', 'Before listen hook succeeded after %d ms', expect.any(Number)],
      ['info', '%s server listening on port %d', 'HTTP', 1234],
    ])
  })

  it('should use HTTP when the TLS configuration is incomplete', async () => {
    const app = createApplication(port, metricsPort, {
      tls: { cert: 'mock-cert-content' },
    })
    const logger = app.get('logger')
    const server = createServer(app, metricsApp)

    await server.run()

    expect(logger.log.mock.calls).toEqual([
      ['info', 'Metrics server listening on port %d', metricsPort],
      ['debug', 'Before listen hook succeeded after %d ms', expect.any(Number)],
      ['info', '%s server listening on port %d', 'HTTP', port],
    ])
  })

  it('should initialize terminus', async () => {
    expect(terminus.createTerminus).toHaveBeenCalledTimes(1)
    expect(terminus.createTerminus.mock.calls[0]).toHaveLength(2)
    const { healthChecks, beforeShutdown, onSignal, onShutdown, logger: error } = terminus.createTerminus.mock.calls[0][1]
    for (const key in healthChecks) {
      healthChecks[key]()
    }
    expect(healthCheck).toHaveBeenCalledTimes(2)
    expect(healthCheck.mock.calls).toEqual([[false], [true]])

    setTimeoutSpy.mockClear()
    beforeShutdown()
    vi.runAllTimers()
    expect(setTimeoutSpy).toHaveBeenCalledTimes(1)
    expect(setTimeoutSpy).toHaveBeenLastCalledWith(expect.any(Function), 1200)

    logger.log.mockClear()
    onSignal()
    expect(hooks.cleanup).toHaveBeenCalledTimes(1)
    expect(logger.log).toHaveBeenCalledTimes(1)
    expect(logger.log.mock.calls).toEqual([['debug', 'Server is starting cleanup']])

    logger.log.mockClear()
    onShutdown()
    expect(logger.log).toHaveBeenCalledTimes(1)
    expect(logger.log.mock.calls).toEqual([['debug', 'Cleanup has been finished. Server is shutting down']])

    logger.log.mockClear()
    error('Failed')
    expect(logger.log).toHaveBeenCalledTimes(1)
    expect(logger.log.mock.calls).toEqual([['error', 'Failed']])
  })
})

describe('server (https)', () => {
  const port = 1234
  const metricsPort = 5678
  const tls = {
    cert: 'mock-cert-content',
    key: 'mock-key-content',
  }
  const mockServer = {
    listen: vi.fn((_, callback) => setImmediate(callback)),
  }
  let app
  let logger
  let server
  let mockHttpCreateServer
  let mockHttpsCreateServer

  let setTimeoutSpy

  beforeAll(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true, toFake: ['setTimeout', 'clearTimeout'] })
    setTimeoutSpy = vi.spyOn(global, 'setTimeout')
  })

  afterAll(() => {
    vi.useRealTimers()
  })

  beforeEach(() => {
    setTimeoutSpy.mockClear()
    mockHttpCreateServer = vi.spyOn(http, 'createServer').mockReturnValue(mockServer)
    mockHttpsCreateServer = vi.spyOn(https, 'createServer').mockReturnValue(mockServer)
    app = createApplication(port, metricsPort, { tls })
    logger = app.get('logger')
    server = createServer(app, metricsApp)
  })

  it('should create an HTTPS server when TLS is configured', async () => {
    expect(mockHttpsCreateServer).toHaveBeenCalledTimes(1)
    expect(mockHttpsCreateServer.mock.calls[0][0]).toEqual({
      cert: 'mock-cert-content',
      key: 'mock-key-content',
    })
    expect(mockHttpsCreateServer.mock.calls[0][1]).toBe(app)
    expect(mockHttpCreateServer).toHaveBeenCalledTimes(1)
    expect(mockHttpCreateServer.mock.calls[0][0]).toBe(metricsApp)
  })

  it('should log HTTPS protocol on startup', async () => {
    await server.run()
    expect(logger.log.mock.calls).toEqual([
      ['info', 'Metrics server listening on port %d', metricsPort],
      ['debug', 'Before listen hook succeeded after %d ms', expect.any(Number)],
      ['info', '%s server listening on port %d', 'HTTPS', port],
    ])
  })
})
