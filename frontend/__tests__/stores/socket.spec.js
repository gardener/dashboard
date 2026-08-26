// SPDX-FileCopyrightText: Copyright Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import { nextTick } from 'vue'
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
    let mockSignout
    let mockIsExpired

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
      mockIsExpired = vi.spyOn(authnStore, 'isExpired').mockResolvedValue(false)
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

    it('should close the connection by "transport close"', async () => {
      mockSocket.connected = true
      mockSocket.active = true
      socketStore.disconnect()
      await Promise.resolve()
      expect(socketStore.connected).toBe(false)
      expect(mockSocket.active).toBe(true)
      expect(mockSocket.disconnect).toBeCalledTimes(1)
      expect(socketStore.connected).toBe(false)
      expect(socketStore.active).toBe(true)
    })

    it('should close the connection by "io server disconnect"', async () => {
      mockSocket.emit('disconnect', 'io server disconnect')
      await Promise.resolve()
      expect(socketStore.connected).toBe(false)
      expect(socketStore.active).toBe(true)
      await vi.runOnlyPendingTimersAsync()

      expect(mockSocket.connect).toBeCalledTimes(1)
    })

    it('should wait for the asynchronous expiry result before reconnecting', async () => {
      let resolveExpired
      mockIsExpired.mockReturnValue(new Promise(resolve => {
        resolveExpired = () => resolve(false)
      }))

      mockSocket.emit('disconnect', 'io server disconnect')
      await Promise.resolve()
      expect(mockSocket.connect).not.toBeCalled()

      resolveExpired()
      await Promise.resolve()
      await vi.runOnlyPendingTimersAsync()

      expect(mockSocket.connect).toBeCalledTimes(1)
      expect(mockSignout).not.toBeCalled()
    })

    it('should wait for the asynchronous expiry result before signing out', async () => {
      let resolveExpired
      mockIsExpired.mockReturnValue(new Promise(resolve => {
        resolveExpired = () => resolve(true)
      }))

      mockSocket.emit('disconnect', 'io server disconnect')
      await Promise.resolve()
      expect(mockSignout).not.toBeCalled()
      expect(mockSocket.connect).not.toBeCalled()

      resolveExpired()
      await Promise.resolve()
      await vi.runOnlyPendingTimersAsync()

      expect(mockSignout).toBeCalledTimes(1)
      expect(mockSocket.connect).not.toBeCalled()
    })

    it('should wait for the asynchronous expiry result before connecting when the user changes', async () => {
      let resolveExpired
      mockIsExpired.mockReturnValue(new Promise(resolve => {
        resolveExpired = () => resolve(false)
      }))

      authnStore.user = { id: 'john.doe' }
      await nextTick()
      expect(mockSocket.connect).not.toBeCalled()

      resolveExpired()
      await nextTick()
      await Promise.resolve()

      expect(mockSocket.connect).toBeCalledTimes(1)
    })

    it('should ignore a stale expiry result when the user changes again', async () => {
      let resolveFirst
      let resolveSecond
      mockIsExpired
        .mockReturnValueOnce(new Promise(resolve => {
          resolveFirst = () => resolve(false)
        }))
        .mockReturnValueOnce(new Promise(resolve => {
          resolveSecond = () => resolve(true)
        }))

      authnStore.user = { id: 'john.doe' }
      await nextTick()
      authnStore.user = null
      await nextTick()

      resolveSecond()
      await Promise.resolve()
      expect(mockSocket.disconnect).toBeCalledTimes(1)

      resolveFirst()
      await Promise.resolve()
      expect(mockSocket.connect).not.toBeCalled()
    })
  })
})
