//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { jest } from '@jest/globals'
import http2 from 'http2'

const sessionPoolInstanceMock = jest.fn().mockImplementation(() => {
  return {
    destroy: jest.fn(),
    getSession: jest.fn(),
    request: jest.fn(),
    setSessionTimeout: jest.fn(),
    clearSessionTimeout: jest.fn(),
    setSessionHeartbeat: jest.fn(),
    clearSessionHeartbeat: jest.fn(),
    createSession: jest.fn(),
    deleteSession: jest.fn(),
  }
})

jest.unstable_mockModule('../lib/SessionPool.js', () => {
  const SessionPoolClassMock = jest.fn(
    sessionPoolInstanceMock,
  )

  SessionPoolClassMock.prototype = {
    constructor: sessionPoolInstanceMock.prototype.constructor,
    uuid: 1123,
    destroy: jest.fn(),
    getSession: jest.fn(),
    request: jest.fn(),
    setSessionTimeout: jest.fn(),
    clearSessionTimeout: jest.fn(),
    setSessionHeartbeat: jest.fn(),
    clearSessionHeartbeat: jest.fn(),
    createSession: jest.fn(),
    deleteSession: jest.fn(),
  }
  return {
    default: SessionPoolClassMock,
  }
})

const { default: request } = await import('../lib/index.js')
const { Agent } = request

const { HTTP2_HEADER_HOST } = http2.constants

describe('Agent', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('#constructor', () => {
    it('should create an agent instance with defaults', () => {
      const options = {
        foo: 'bar',
      }
      const agent = new Agent(options)
      expect(agent.defaults.options).toEqual({
        peerMaxConcurrentStreams: 100,
        keepAliveTimeout: 60000,
        connectTimeout: 15000,
        pingInterval: 0,
        ...options,
      })
      expect(agent.sessionPools.size).toBe(0)
    })

    it('should create an agent instance without any defaults', () => {
      const options = {
        peerMaxConcurrentStreams: 100,
        maxOutstandingPings: 2,
        keepAliveTimeout: 60000,
        connectTimeout: 15000,
        pingInterval: 30000,
        foo: 'bar',
      }
      const agent = new Agent(options)
      expect(agent.defaults.options).toEqual(options)
      expect(agent.sessionPools.size).toBe(0)
    })
  })

  describe('#destroy', () => {
    it('should destroy all session pools', () => {
      const agent = new Agent()
      const pools = [
        ['https://foo.org'],
        ['https://bar.org'],
      ]
        .map((...args) => agent.createSessionId(...args))
        .map(sid => agent.getSessionPool(sid))
      expect(Array.from(agent.sessionPools.values())).toEqual(pools)
      agent.destroy()
      for (const pool of pools) {
        expect(pool.destroy).toHaveBeenCalledTimes(1)
      }
    })
  })

  describe('#request', () => {
    it('should send a minimal request', async () => {
      const host = 'foo.org'
      const agent = new Agent()
      const headers = {
        [HTTP2_HEADER_HOST]: host,
      }
      const requestOptions = { id: 'id' }

      const mockRequest = jest.fn()
      jest.spyOn(agent, 'getSessionPool').mockReturnValue({
        request: mockRequest,
      })

      await agent.request(headers, requestOptions)

      expect(agent.getSessionPool).toHaveBeenCalledTimes(1)
      expect(agent.getSessionPool).toHaveBeenCalledWith(
        expect.objectContaining({
          protocol: 'https:',
          host,
          pathname: '/id',
          hash: expect.stringMatching(/^#[a-f0-9]{7}$/),
        }),
      )

      expect(mockRequest).toHaveBeenCalledTimes(1)
      expect(mockRequest).toHaveBeenCalledWith(headers, {})
    })
  })
})
