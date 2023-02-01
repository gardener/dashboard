//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { monitorSocketIO, monitorHttpServer, monitorResponseTimes } = require('../lib/monitors')
const { metrics } = require('../lib/metrics')

jest.mock('../lib/metrics')

describe('monitors', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('socketIO connection monitor', () => {
    const ioStub = { on: jest.fn() }
    const socketStub = { once: jest.fn() }

    it('should add connect/disconnect listeners', () => {
      monitorSocketIO(ioStub)

      expect(ioStub.on).toBeCalledTimes(1)
      expect(ioStub.on).toHaveBeenCalledWith('connection', expect.any(Function))

      const connectHandler = ioStub.on.mock.calls[0][1]
      connectHandler(socketStub)

      expect(socketStub.once).toBeCalledTimes(1)
      expect(socketStub.once).toHaveBeenCalledWith('disconnect', expect.any(Function))
      expect(metrics.connectionsCount.inc).toBeCalledTimes(1)
      expect(metrics.connectionsCount.inc).toHaveBeenLastCalledWith({ type: 'ws' }, 1)
      expect(metrics.connectionsTotal.inc).toBeCalledTimes(1)
      expect(metrics.connectionsTotal.inc).toHaveBeenLastCalledWith({ type: 'ws' }, 1)

      const disconnectHandler = socketStub.once.mock.calls[0][1]
      disconnectHandler()
      expect(metrics.connectionsCount.dec).toBeCalledTimes(1)
      expect(metrics.connectionsCount.dec).toHaveBeenLastCalledWith({ type: 'ws' }, 1)
    })
  })

  describe('HTTP Server connection monitor', () => {
    const serverStub = { on: jest.fn() }

    it('should add connect/close listeners', () => {
      monitorHttpServer(serverStub)

      expect(serverStub.on).toBeCalledTimes(2)
      expect(serverStub.on).toHaveBeenCalledWith('connect', expect.any(Function))
      expect(serverStub.on).toHaveBeenCalledWith('close', expect.any(Function))

      const connectHandler = serverStub.on.mock.calls[0][1]
      const closeHandler = serverStub.on.mock.calls[1][1]

      connectHandler()
      expect(metrics.connectionsCount.inc).toBeCalledTimes(1)
      expect(metrics.connectionsCount.inc).toHaveBeenLastCalledWith({ type: 'http' }, 1)
      expect(metrics.connectionsTotal.inc).toBeCalledTimes(1)
      expect(metrics.connectionsTotal.inc).toHaveBeenLastCalledWith({ type: 'http' }, 1)

      closeHandler()
      expect(metrics.connectionsCount.dec).toBeCalledTimes(1)
      expect(metrics.connectionsCount.dec).toHaveBeenLastCalledWith({ type: 'http' }, 1)
    })
  })

  describe('HTTP Server response time monitor', () => {
    it('should return an express middleware', () => {
      const middleware = monitorResponseTimes()
      expect(middleware).toEqual(expect.any(Function))
      expect(middleware.length).toEqual(3)
    })

    it('should add connect/close listeners', () => {
      const writeHeadStub = jest.fn()
      const resStub = { writeHead: writeHeadStub }
      const defaultLabels = { some: 'label' }
      const method = 'PATCH'
      const nextStub = jest.fn()
      const endTimerStub = jest.fn()
      metrics.responseTime.startTimer.mockReturnValue(endTimerStub)

      const middleware = monitorResponseTimes(defaultLabels)
      middleware({ method }, resStub, nextStub)

      expect(metrics.responseTime.startTimer).toBeCalledTimes(1)
      expect(metrics.responseTime.startTimer).toHaveBeenCalledWith({
        ...defaultLabels,
        method
      })
      expect(resStub.writeHead).toEqual(expect.any(Function))
      expect(resStub.writeHead).not.toEqual(writeHeadStub)
      expect(nextStub).toBeCalledTimes(1)
      expect(nextStub).toBeCalledWith() // expect no error

      resStub.writeHead('testArg')
      expect(endTimerStub).toBeCalledTimes(1)
      expect(writeHeadStub).toHaveBeenCalledWith('testArg')

      resStub.writeHead('testArg')
      expect(endTimerStub).toBeCalledTimes(1)
      expect(writeHeadStub).toBeCalledTimes(2)
    })

    it('should pass on errors', () => {
      const nextStub = jest.fn()
      const writeHeadStub = jest.fn()
      const resStub = { writeHead: writeHeadStub }
      const method = 'PATCH'
      const middleware = monitorResponseTimes()
      const unexpectedError = new Error('some error')

      metrics.responseTime.startTimer.mockImplementationOnce(() => {
        throw unexpectedError
      })

      middleware({ method }, resStub, nextStub)

      expect(nextStub).toBeCalledTimes(1)
      expect(nextStub).toBeCalledWith(unexpectedError)
    })
  })
})
