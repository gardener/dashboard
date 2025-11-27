//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const http = require('http')
const terminus = require('@godaddy/terminus')
const metricsApp = require('@gardener-dashboard/monitor')
const createServer = require('../dist/lib/server')

function createApplication (port, metricsPort) {
  const app = (req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' })
    res.end('ok', 'utf8')
  }
  const map = new Map()
  map.set('port', port)
  map.set('metricsPort', metricsPort)
  map.set('periodSeconds', 1)
  map.set('healthCheck', jest.fn())
  map.set('hooks', {
    cleanup: jest.fn(() => Promise.resolve()),
    beforeListen: jest.fn(() => Promise.resolve()),
  })
  map.set('logger', {
    log: jest.fn(),
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
    listen: jest.fn((_, callback) => setImmediate(callback)),
  }
  const mockTerminus = {}
  let app
  let hooks
  let logger
  let healthCheck
  let server
  let mockCreateServer
  let mockCreateTerminus

  beforeAll(() => {
    jest.useFakeTimers({ legacyFakeTimers: true })
  })

  afterAll(() => {
    jest.useRealTimers()
  })

  beforeEach(() => {
    mockCreateServer = jest.spyOn(http, 'createServer').mockReturnValue(mockServer)
    mockCreateTerminus = jest.spyOn(terminus, 'createTerminus').mockReturnValue(mockTerminus)
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
      ['info', 'Server listening on port %d', 1234],
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

    global.setTimeout.mockClear()
    beforeShutdown()
    jest.runAllTimers()
    expect(setTimeout).toHaveBeenCalledTimes(1)
    expect(setTimeout).toHaveBeenLastCalledWith(expect.any(Function), 1200)

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
