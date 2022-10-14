// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import createPlugin from '@/store/plugins/socketPlugin'
import { io, mockSocket } from 'socket.io-client'
jest.mock('socket.io-client', () => {
  const EventEmitter = jest.requireActual('eventemitter3')
  const mockSocket = new EventEmitter()
  Object.assign(mockSocket, {
    connected: false,
    connect: jest.fn(() => {
      mockSocket.connected = true
    }),
    disconnect: jest.fn(() => {
      mockSocket.connected = false
    })
  })
  const mockManagerPrototype = new EventEmitter()
  mockManagerPrototype.open = jest.fn()
  const mockManager = mockSocket.io = Object.create(mockManagerPrototype)
  const Manager = jest.fn(() => mockManager)
  Manager.prototype = mockManagerPrototype
  return {
    __esModule: true,
    io: jest.fn(() => mockSocket),
    Manager,
    mockSocket
  }
})

describe('store', () => {
  describe('socketPlugin', () => {
    const userManager = {
      ensureValidToken: jest.fn().mockImplementation(() => Promise.resolve()),
      signout: jest.fn()
    }
    const logger = {
      error: jest.fn(),
      info: jest.fn(),
      debug: jest.fn()
    }
    const store = {
      commit: jest.fn(),
      subscribe: jest.fn()
    }

    beforeEach(() => {
      mockSocket.connected = false
      createPlugin(userManager, logger)(store)
    })

    it('should create the socket plugin', () => {
      expect(io).toBeCalledTimes(1)
      expect(io.mock.calls[0]).toEqual([{
        path: '/api/events',
        transports: ['websocket'],
        autoConnect: false
      }])
      expect(store.subscribe).toBeCalledTimes(1)
      expect(store.subscribe.mock.calls[0]).toEqual([
        expect.any(Function)
      ])
      const handleMutation = store.subscribe.mock.calls[0][0]
      expect(mockSocket.connected).toBe(false)
      handleMutation({ type: 'socket/CONNECT' })
      expect(mockSocket.connect).toBeCalledTimes(1)
      mockSocket.connect.mockClear()
      expect(mockSocket.connected).toBe(true)
      handleMutation({ type: 'SET_USER', payload: null })
      expect(mockSocket.disconnect).toBeCalledTimes(1)
      expect(mockSocket.connected).toBe(false)
    })

    it('should handle mutation "socket/CONNECT"', () => {
      const [handler] = store.subscribe.mock.calls[0]
      expect(mockSocket.connected).toBe(false)
      handler({ type: 'socket/CONNECT' })
      expect(mockSocket.connected).toBe(true)
      expect(mockSocket.connect).toBeCalledTimes(1)
    })

    it('should handle mutation "SET_USER"', () => {
      const [handler] = store.subscribe.mock.calls[0]
      expect(mockSocket.connected).toBe(false)
      handler({ type: 'SET_USER', payload: {} })
      expect(mockSocket.connected).toBe(true)
      handler({ type: 'SET_USER', payload: null })
      expect(mockSocket.connected).toBe(false)
      expect(mockSocket.disconnect).toBeCalledTimes(2)
    })
  })
})
