// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  setActivePinia,
  createPinia,
} from 'pinia'
import {
  io,
  mockSocket,
} from 'socket.io-client'

import { useSocketStore } from '@/store/socket'
import { useAuthnStore } from '@/store/authn'

vi.mock('socket.io-client', async () => {
  const { EventEmitter } = await vi.importActual('eventemitter3')
  const mockSocket = new EventEmitter()
  Object.assign(mockSocket, {
    connected: false,
    connect: vi.fn(() => {
      mockSocket.connected = true
      mockSocket.active = true
      mockSocket.emit('connect')
    }),
    disconnect: vi.fn(() => {
      mockSocket.connected = false
      mockSocket.emit('disconnect', 'transport close')
    }),
  })
  const mockManagerPrototype = new EventEmitter()
  mockManagerPrototype.open = vi.fn()
  const mockManager = mockSocket.io = Object.create(mockManagerPrototype)
  const Manager = vi.fn(() => mockManager)
  Manager.prototype = mockManagerPrototype
  return {
    io: vi.fn(() => mockSocket),
    Manager,
    mockSocket,
  }
})

const noop = () => Promise.resolve()

describe('store', () => {
  describe('socketPlugin', () => {
    let socketStore
    let authnStore
    let mockEnsureValidToken // eslint-disable-line no-unused-vars
    let mockSignout // eslint-disable-line no-unused-vars
    let mockIsExpired // eslint-disable-line no-unused-vars

    beforeEach(() => {
      vi.useFakeTimers()
      setActivePinia(createPinia())
      mockSocket.connected = false
      mockSocket.active = false
      mockSocket.connect.mockClear()
      mockSocket.disconnect.mockClear()
      authnStore = useAuthnStore()
      mockEnsureValidToken = vi.spyOn(authnStore, 'ensureValidToken').mockImplementation(noop)
      mockSignout = vi.spyOn(authnStore, 'signout').mockImplementation(noop)
      mockIsExpired = vi.spyOn(authnStore, 'isExpired').mockReturnValue(false)
      socketStore = useSocketStore()
    })

    afterEach(() => {
      vi.useRealTimers()
      mockSocket.removeAllListeners()
    })

    it('should create the socket instance', () => {
      expect(io).toBeCalledTimes(1)
      expect(io.mock.calls[0]).toEqual([{
        path: '/api/events',
        transports: ['websocket'],
        autoConnect: false,
      }])
      expect(mockSocket.connected).toBe(false)
      expect(mockSocket.connect).not.toBeCalled()
      expect(socketStore.connected).toBe(false)
      expect(socketStore.active).toBe(false)
    })

    it('should establish a connection', () => {
      socketStore.connect()
      expect(mockSocket.connected).toBe(true)
      expect(mockSocket.active).toBe(true)
      expect(mockSocket.connect).toBeCalledTimes(1)
      expect(socketStore.connected).toBe(true)
      expect(socketStore.active).toBe(true)
    })

    it('should close the connection by "transport close"', () => {
      mockSocket.connected = true
      mockSocket.active = true
      socketStore.disconnect()
      expect(socketStore.connected).toBe(false)
      expect(mockSocket.active).toBe(true)
      expect(mockSocket.disconnect).toBeCalledTimes(1)
      expect(socketStore.connected).toBe(false)
      expect(socketStore.active).toBe(true)
    })

    it('should close the connection by "io server disconnect"', async () => {
      mockSocket.emit('disconnect', 'io server disconnect')
      expect(socketStore.connected).toBe(false)
      expect(socketStore.active).toBe(true)
      await vi.runOnlyPendingTimersAsync()

      expect(mockSocket.connect).toBeCalledTimes(1)
    })
  })
})
