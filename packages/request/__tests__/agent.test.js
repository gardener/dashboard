//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const http2 = require('http2')
const { Agent } = require('../lib')
const SessionPool = require('../lib/SessionPool')

jest.mock('../lib/SessionPool')

const { HTTP2_HEADER_HOST } = http2.constants

describe('Agent', () => {
  beforeEach(() => {
    SessionPool.mockClear()
  })

  describe('#constructor', () => {
    it('should create an agent instance with defaults', () => {
      const options = {
        foo: 'bar'
      }
      const agent = new Agent(options)
      expect(agent.defaults.options).toEqual({
        peerMaxConcurrentStreams: 100,
        maxOutstandingPings: 2,
        keepAliveTimeout: 60000,
        connectTimeout: 15000,
        pingInterval: 30000,
        ...options
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
        foo: 'bar'
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
        ['https://bar.org']
      ]
        .map((...args) => agent.createSessionId(...args))
        .map(sid => agent.getSessionPool(sid))
      expect(Array.from(agent.sessionPools.values())).toEqual(pools)
      agent.destroy()
      for (const pool of pools) {
        expect(pool.destroy).toBeCalledTimes(1)
      }
    })
  })

  describe('#request', () => {
    it('should send a minimal request', async () => {
      const host = 'foo.org'
      const agent = new Agent()
      const headers = {
        [HTTP2_HEADER_HOST]: host
      }
      await agent.request(headers, { id: 'id' })
      expect(SessionPool).toBeCalledTimes(1)
      expect(SessionPool.mock.calls[0]).toEqual([
        expect.objectContaining({
          protocol: 'https:',
          host,
          pathname: expect.stringMatching(/^\/[a-f0-9]{32}\/id$/)
        })
      ])
      const pool = SessionPool.mock.instances[0]
      expect(pool.request).toBeCalledTimes(1)
      expect(pool.request.mock.calls[0]).toEqual([
        headers, {}
      ])
    })
  })
})
