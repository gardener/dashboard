//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { jest } from '@jest/globals'
import { createRequire } from 'module'

/**
 * Partial spy on the specified methods or properties.
 *
 * @param {string} moduleName - The name of the module to mock.
 * @param {string[]} methodPaths - An array of method paths to spy. Each path should be a dot-separated string
 *                                 representing the method's location within the module (e.g., "connectionsCount.inc").
 * @param importMetaUrl
 * @returns {Promise<void>} A promise that resolves when the module is mocked.
 */
async function spyOnHelper (moduleName, methodPaths, importMetaUrl = '') {
  if (importMetaUrl) {
    moduleName = moduleResolve(importMetaUrl, moduleName)
  }

  const { default: actual } = await import(moduleName)

  for (const method of methodPaths) {
    if (method.includes('.')) {
      const parts = method.split('.')
      const property = parts.pop() // Get the last part (e.g., 'inc')

      const parent = parts.reduce((obj, key) => obj[key], actual)

      parent[property] = jest.fn(parent[property])
    } else {
      return {
        default: jest.fn(actual),
      }
    }
  }
  return {
    default: actual,
  }
}

function moduleResolve (importMetaUrl, modulePath) {
  const require = createRequire(importMetaUrl)
  return require.resolve(modulePath)
}

const { default: spy } = await spyOnHelper('../lib/metrics.js',
  [
    'connectionsCount.inc',
    'connectionsTotal.inc',
    'connectionsCount.dec',

  ],
  import.meta.url,
)

jest.unstable_mockModule('../lib/metrics.js', () => {
  return {
    default: {
      ...spy,
      responseTime: {
        observe: jest.fn(),
      },
    },
  }
})

const { default: metrics } = await import('../lib/metrics.js')

const {
  default: {
    monitorSocketIO,
    monitorHttpServer,
    monitorResponseTimes,
  },
} = await import('../lib/monitors.js')

const { default: responseTime } = await import('response-time')

describe('monitors', () => {
  describe('socketIO connection monitor', () => {
    const ioStub = { on: jest.fn() }
    const socketStub = { once: jest.fn() }

    it('should add connect/disconnect listeners', () => {
      monitorSocketIO(ioStub)

      expect(ioStub.on).toHaveBeenCalledTimes(1)
      expect(ioStub.on).toHaveBeenCalledWith('connection', expect.any(Function))

      const connectHandler = ioStub.on.mock.calls[0][1]
      connectHandler(socketStub)

      expect(socketStub.once).toHaveBeenCalledTimes(1)
      expect(socketStub.once).toHaveBeenCalledWith('disconnect', expect.any(Function))
      expect(metrics.connectionsCount.inc).toHaveBeenCalledTimes(1)
      expect(metrics.connectionsCount.inc).toHaveBeenLastCalledWith({ type: 'ws' }, 1)
      expect(metrics.connectionsTotal.inc).toHaveBeenCalledTimes(1)
      expect(metrics.connectionsTotal.inc).toHaveBeenLastCalledWith({ type: 'ws' }, 1)

      const disconnectHandler = socketStub.once.mock.calls[0][1]
      disconnectHandler()
      expect(metrics.connectionsCount.dec).toHaveBeenCalledTimes(1)
      expect(metrics.connectionsCount.dec).toHaveBeenLastCalledWith({ type: 'ws' }, 1)
    })
  })

  describe('HTTP Server connection monitor', () => {
    const serverStub = { on: jest.fn() }

    it('should add connect/close listeners', () => {
      monitorHttpServer(serverStub)

      expect(serverStub.on).toHaveBeenCalledTimes(1)
      expect(serverStub.on).toHaveBeenCalledWith('request', expect.any(Function))

      const connectHandler = serverStub.on.mock.calls[0][1]
      const res = {
        once: jest.fn(),
      }

      connectHandler(undefined, res)
      expect(metrics.connectionsCount.inc).toHaveBeenCalledTimes(1)
      expect(metrics.connectionsCount.inc).toHaveBeenLastCalledWith({ type: 'http' }, 1)
      expect(metrics.connectionsTotal.inc).toHaveBeenCalledTimes(1)
      expect(metrics.connectionsTotal.inc).toHaveBeenLastCalledWith({ type: 'http' }, 1)

      expect(res.once).toHaveBeenCalledTimes(1)
      const onceCall = res.once.mock.calls[0]
      expect(onceCall[0]).toEqual('close')
      const reqCloseHandler = onceCall[1]
      expect(reqCloseHandler).toEqual(expect.any(Function))

      reqCloseHandler()
      expect(metrics.connectionsCount.dec).toHaveBeenCalledTimes(1)
      expect(metrics.connectionsCount.dec).toHaveBeenLastCalledWith({ type: 'http' }, 1)
    })
  })

  describe('HTTP Server response time monitor', () => {
    it('should report observed respons times with additional labels', () => {
      const additionalLabels = { some: 'label' }
      const method = 'PATCH'
      const statusCode = 42
      const requestDuration = 1234
      monitorResponseTimes(additionalLabels)
      expect(responseTime).toHaveBeenCalledTimes(1)
      const responseTimeHandler = responseTime.mock.calls[0][0]
      expect(responseTimeHandler).toEqual(expect.any(Function))

      responseTimeHandler({ method }, { statusCode }, requestDuration)

      expect(metrics.responseTime.observe).toHaveBeenCalledTimes(1)
      expect(metrics.responseTime.observe).toHaveBeenCalledWith({
        ...additionalLabels,
        method,
        status_code: statusCode,
      }, requestDuration / 1000)
    })

    it('should report observed respons times without additional labels', () => {
      const method = 'PATCH'
      const statusCode = 42
      const requestDuration = 1234

      monitorResponseTimes()
      expect(responseTime).toHaveBeenCalledTimes(1)
      const responseTimeHandler = responseTime.mock.calls[0][0]
      expect(responseTimeHandler).toEqual(expect.any(Function))

      responseTimeHandler({ method }, { statusCode }, requestDuration)

      expect(metrics.responseTime.observe).toHaveBeenCalledTimes(1)
      expect(metrics.responseTime.observe).toHaveBeenCalledWith({
        method,
        status_code: statusCode,
      }, requestDuration / 1000)
    })

    it('should report observed respons times with route label', () => {
      const method = 'PATCH'
      const statusCode = 42
      const requestDuration = 1234
      const metricsRoute = 'someroute/:name'

      monitorResponseTimes()
      expect(responseTime).toHaveBeenCalledTimes(1)
      const responseTimeHandler = responseTime.mock.calls[0][0]
      expect(responseTimeHandler).toEqual(expect.any(Function))

      responseTimeHandler({ method, metricsRoute }, { statusCode }, requestDuration)

      expect(metrics.responseTime.observe).toHaveBeenCalledTimes(1)
      expect(metrics.responseTime.observe).toHaveBeenCalledWith({
        method,
        route: metricsRoute,
        status_code: statusCode,
      }, requestDuration / 1000)
    })
  })
})
