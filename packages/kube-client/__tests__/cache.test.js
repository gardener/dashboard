//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const EventEmitter = require('events')
const pEvent = require('p-event')
const moment = require('moment')

const ApiErrors = require('../lib/ApiErrors')
const { Reflector, Store, ListPager } = require('../lib/cache')
const nextTick = () => new Promise(resolve => process.nextTick(resolve))

describe('kube-client', () => {
  describe('cache', () => {
    let map
    let store
    let listWatcher
    let destroyAgentSpy

    function createDummy (metadata) {
      return {
        apiVersion: 'v1',
        kind: 'Dummy',
        metadata: { ...metadata }
      }
    }

    const a = createDummy({ uid: 'a', resourceVersion: '1' })
    const b = createDummy({ uid: 'b', resourceVersion: '2' })
    const c = createDummy({ uid: 'c', resourceVersion: '3' })
    const x = createDummy({ uid: 'a', resourceVersion: '4' })
    const bookmark = createDummy({ resourceVersion: '9' })

    class TestSocket extends EventEmitter {
      constructor ({ maxPingPongCount = Infinity } = {}) {
        super()
        this.readyState = 0
        this.pingPongCount = 0
        this.maxPingPongCount = maxPingPongCount
        process.nextTick(() => {
          this.readyState = 1
          this.emit('open')
        })
      }

      ping () {
        if (this.pingPongCount < this.maxPingPongCount) {
          this.pingPongCount++
          process.nextTick(() => this.emit('pong'))
        }
      }

      close () {
        if (this.readyState < 2) {
          this.readyState = 2
          process.nextTick(() => {
            this.readyState = 3
            this.emit('close')
          })
        }
      }

      terminate () {
        if (this.readyState < 2) {
          this.close()
        }
      }
    }

    class Agent {
      destroy () {}
    }

    class TestPager {
      constructor () {
        this.pageSize = 7
      }

      list () {
        return {
          items: []
        }
      }
    }

    class TestListWatcher {
      constructor (socket) {
        this.agent = new Agent()
        this.group = ''
        this.version = 'v1'
        this.names = {
          kind: 'Dummy',
          plural: 'dummies'
        }
        this.socket = socket
        this.expiredErrorForToken = undefined
        this.messages = []
      }

      async list ({ limit, continue: continueToken }) {
        await nextTick()
        const metadata = {
          resourceVersion: '2',
          selfLink: 'link'
        }
        if (!continueToken) {
          if (limit !== 1) {
            return { metadata: { ...metadata }, items: [a, b] }
          }
          return { metadata: { continue: 'b', ...metadata }, items: [a] }
        }
        if (continueToken === this.expiredErrorForToken) {
          throw new ApiErrors.StatusError({
            code: 410,
            reason: 'Expired',
            message: 'Resource is expired'
          })
        }
        if (continueToken === 'b') {
          return {
            metadata: {},
            items: [b]
          }
        }
        throw new Error('Unexpected continue token')
      }

      watch (options) {
        this.socket = new TestSocket()
        while (this.messages.length) {
          this.socket.emit('message', this.messages.shift())
        }
        return this.socket
      }

      emitEvent (event) {
        const message = JSON.stringify(event)
        if (this.socket) {
          this.socket.emit('message', message)
        } else {
          this.messages.push(message)
        }
      }

      closeWatch () {
        this.socket.terminate()
      }
    }

    beforeEach(() => {
      map = new Map()
      store = new Store(map, { timeout: 1 })
      listWatcher = new TestListWatcher()
      destroyAgentSpy = jest.spyOn(listWatcher.agent, 'destroy')
    })

    describe('Store', () => {
      let clearSpy

      beforeEach(() => {
        clearSpy = jest.spyOn(store, 'clear')
      })

      it('should add, update and delete elements', async () => {
        expect(store).toBeInstanceOf(Store)
        expect(store.isFresh).toBe(false)

        // refresh
        store.setRefreshing()
        expect(store.isFresh).toBe(false)

        // replace [a]
        store.replace([a])
        expect(store.isFresh).toBe(true)
        expect(clearSpy).toHaveBeenCalledTimes(1)
        clearSpy.mockClear()
        expect(store.has(a)).toBe(true)
        expect(store.get(a)).toBe(a)
        expect(store.getByKey('a')).toBe(a)
        expect(store.list()).toEqual([a])

        // add b
        store.add(b)
        expect(store.listKeys()).toEqual(['a', 'b'])

        // update a
        store.update(x)
        expect(store.listKeys()).toEqual(['a', 'b'])
        expect(store.getByKey('a')).toBe(x)

        // delete b
        store.delete(b)
        expect(store.listKeys()).toEqual(['a'])

        store.setRefreshing()
        await pEvent(store, 'stale')
        expect(store.isFresh).toBe(false)
      })
    })

    describe('ListPager', () => {
      it('should return a list of paginated results', async () => {
        const listPager = ListPager.create(listWatcher, { pageSize: 1 })
        expect(listPager).toBeInstanceOf(ListPager)
        expect(listPager.pageSize).toBe(1)
        expect(listPager.fullListIfExpired).toBe(true)
        const options = { resourceVersion: '0' }
        const { metadata, items } = await listPager.list(options)
        expect(metadata).toEqual({
          resourceVersion: '2',
          selfLink: 'link',
          paginated: true
        })
        expect(items).toEqual([a, b])
      })

      it('should return a full list', async () => {
        const listPager = ListPager.create(listWatcher, { pageSize: 2 })
        expect(listPager).toBeInstanceOf(ListPager)
        expect(listPager.pageSize).toBe(2)
        expect(listPager.fullListIfExpired).toBe(true)
        const options = { resourceVersion: '0' }
        const { metadata, items } = await listPager.list(options)
        expect(metadata).toEqual({
          resourceVersion: '2',
          selfLink: 'link'
        })
        expect(items).toEqual([a, b])
      })

      it('should throw an "Expired" error for the second page', async () => {
        listWatcher.expiredErrorForToken = 'b'
        const listPager = ListPager.create(listWatcher, { pageSize: 1, fullListIfExpired: false })
        expect.assertions(6)
        expect(listPager).toBeInstanceOf(ListPager)
        expect(listPager.pageSize).toBe(1)
        expect(listPager.fullListIfExpired).toBe(false)
        const options = { resourceVersion: '0' }
        try {
          await listPager.list(options)
        } catch (err) {
          // eslint-disable-next-line jest/no-try-expect
          expect(ApiErrors.isExpiredError(err)).toBe(true)
        }
        listPager.fullListIfExpired = true
        const { metadata, items } = await listPager.list(options)
        expect(metadata).toEqual({
          resourceVersion: '2',
          selfLink: 'link',
          paginated: true
        })
        expect(items).toEqual([a, b])
      })
    })

    describe('Reflector', () => {
      let reflector

      beforeEach(() => {
        reflector = Reflector.create(listWatcher, store)
        reflector.period = moment.duration(1)
        reflector.backoffManager.min = 1
        reflector.backoffManager.max = 10
      })

      afterEach(async () => {
        await reflector.stop()
      })

      it('should destroy the agent on stop', async () => {
        await reflector.stop()
        expect(destroyAgentSpy).toHaveBeenCalledTimes(1)
      })

      it('should have property apiVersion', async () => {
        expect(reflector.apiVersion).toBe('v1')
        listWatcher.group = 'test'
      })

      it('should have property kind', async () => {
        expect(reflector.kind).toBe('Dummy')
      })

      it('should have property expectedTypeName', async () => {
        expect(reflector.expectedTypeName).toBe('v1, Kind=Dummy')
        listWatcher.group = 'test'
        expect(reflector.expectedTypeName).toBe('test/v1, Kind=Dummy')
      })

      it('should return a resourceVersion for listing', async () => {
        reflector.isLastSyncResourceVersionUnavailable = true
        expect(reflector.relistResourceVersion).toBe('')
        reflector.isLastSyncResourceVersionUnavailable = false
        expect(reflector.relistResourceVersion).toBe('0')
        reflector.lastSyncResourceVersion = '1'
        expect(reflector.relistResourceVersion).toBe('1')
      })

      describe('#heartbeat', () => {
        it('should start the heartbeat', async () => {
          reflector.heartbeatInterval = moment.duration(1)
          const socket = new TestSocket({ maxPingPongCount: 3 })
          await reflector.heartbeat(socket)
          expect(socket.pingPongCount).toBe(3)
        })
      })

      describe('#watchHandler', () => {
        it('should handle watch events', async () => {
          const error = { code: 410, reason: 'Expired' }
          const socket = new EventEmitter()

          function emitMessage (message, ms) {
            setTimeout(() => socket.emit('message', message), ms)
          }

          function emitEvent (event, ms) {
            emitMessage(JSON.stringify(event), ms)
          }

          emitEvent({ type: 'ADDED', object: a }, 1)
          emitEvent({ type: 'ADDED', object: b }, 2)
          emitEvent({ type: 'MODIFIED', object: b }, 3)
          emitEvent({ type: 'DELETED', object: a }, 5)
          emitEvent({ type: 'BOOKMARK', object: bookmark }, 6)
          emitEvent({ type: 'ERROR', object: error }, 7)

          emitMessage('{ERROR}', 4)
          emitEvent({ type: 'ADDED', object: {} }, 4)
          emitEvent({ type: 'PATCHED', object: a }, 4)

          expect.assertions(3)
          try {
            await reflector.watchHandler(socket)
          } catch (err) {
            // eslint-disable-next-line jest/no-try-expect
            expect(ApiErrors.isExpiredError(err)).toBe(true)
          }

          expect(reflector.lastSyncResourceVersion).toBe('9')
          expect(store.listKeys()).toEqual(['b'])
        })
      })

      describe('#listAndWatch', () => {
        const expiredError = new ApiErrors.StatusError({ code: 410, reason: 'Expired' })
        const connectionRefusedError = new Error('Connection refused')
        connectionRefusedError.code = 'ECONNREFUSED'
        const unexpectedError = new Error('Failed')
        let pager
        let socket
        let listStub
        let listOptions
        let watchStub
        let watchOptions
        let createPagerStub
        let heartbeatStub
        let watchHandlerStub
        let terminateSpy
        let closeStub

        beforeEach(() => {
          reflector.period = moment.duration(1)
          reflector.gracePeriod = moment.duration(1)
          reflector.minWatchTimeout = moment.duration(30, 'seconds')
          pager = new TestPager()
          socket = new EventEmitter()
          createPagerStub = jest.spyOn(ListPager, 'create').mockReturnValue(pager)
          listStub = jest.spyOn(pager, 'list')
          watchStub = jest.spyOn(reflector.listWatcher, 'watch')
          socket.readyState = 0
          socket.terminate = () => {}
          terminateSpy = jest.spyOn(socket, 'terminate')
          socket.close = () => {}
          closeStub = jest.spyOn(socket, 'close')
          heartbeatStub = jest
            .spyOn(reflector, 'heartbeat')
            .mockImplementation(() => {
              socket.isAlive = true
            })
          watchHandlerStub = jest.spyOn(reflector, 'watchHandler')
        })

        it('should list and fail', async () => {
          listStub.mockImplementationOnce(() => {
            throw unexpectedError
          })
          reflector.listAndWatch()
          expect(createPagerStub).toHaveBeenCalledTimes(1)
          expect(listStub).toHaveBeenCalledTimes(1)
          listOptions = listStub.mock.calls[0][0]
          expect(listOptions).toEqual({ resourceVersion: '0' })
        })

        it('should list, fall back to resourceVersion="" and fail', async () => {
          listStub.mockImplementationOnce(() => {
            throw expiredError
          })
          listStub.mockImplementationOnce(() => {
            throw unexpectedError
          })
          reflector.listAndWatch()
          expect(createPagerStub).toHaveBeenCalledTimes(1)
          expect(listStub).toHaveBeenCalledTimes(2)
          listOptions = listStub.mock.calls[0][0]
          expect(listOptions).toEqual({ resourceVersion: '0' })
          listOptions = listStub.mock.calls[1][0]
          expect(listOptions).toEqual({ resourceVersion: '' })
        })

        it('should list, retry to start watching and fail', async () => {
          listStub.mockImplementation(async () => {
            return {
              metadata: {
                resourceVersion: '2',
                paginated: true
              },
              items: [a, b]
            }
          })
          watchStub.mockImplementationOnce(() => {
            process.nextTick(() => {
              socket.emit('error', connectionRefusedError)
            })
            return socket
          })
          watchStub.mockImplementationOnce(() => {
            process.nextTick(() => {
              socket.readyState = 1
              socket.emit('error', expiredError)
            })
            return socket
          })
          closeStub.mockImplementation(() => {
            process.nextTick(() => {
              socket.readyState = 3
              socket.emit('close')
            })
          })
          await reflector.listAndWatch()
          expect(createPagerStub).toHaveBeenCalledTimes(1)
          expect(listStub).toHaveBeenCalledTimes(1)
          expect(listStub).toHaveBeenCalledTimes(1)
          expect(watchStub).toHaveBeenCalledTimes(2)
          watchOptions = watchStub.mock.calls[0][0]
          expect(watchOptions.allowWatchBookmarks).toBe(true)
          expect(watchOptions.timeoutSeconds).toBeGreaterThanOrEqual(30)
          expect(watchOptions.timeoutSeconds).toBeLessThanOrEqual(60)
          expect(watchOptions.resourceVersion).toBe('2')
          watchOptions = watchStub.mock.calls[1][0]
          expect(watchOptions.allowWatchBookmarks).toBe(true)
          expect(watchOptions.timeoutSeconds).toBeGreaterThanOrEqual(30)
          expect(watchOptions.timeoutSeconds).toBeLessThanOrEqual(60)
          expect(watchOptions.resourceVersion).toBe('2')
          expect(closeStub).toHaveBeenCalledTimes(2)
          expect(store.listKeys()).toEqual(['a', 'b'])
        })

        it('should list, start watching and exit', async () => {
          listStub.mockImplementation(async () => {
            return {
              metadata: {
                resourceVersion: '2',
                paginated: true
              },
              items: [a, b]
            }
          })
          watchStub.mockImplementation(() => {
            process.nextTick(() => {
              reflector.stopRequested = true
              socket.readyState = 1
              socket.emit('open')
            })
            return socket
          })
          closeStub.mockImplementation(() => {
            process.nextTick(() => {
              socket.readyState = 3
              socket.emit('close')
            })
          })
          await reflector.listAndWatch()
          expect(createPagerStub).toHaveBeenCalledTimes(1)
          expect(listStub).toHaveBeenCalledTimes(1)
          expect(listStub).toHaveBeenCalledTimes(1)
          expect(watchStub).toHaveBeenCalledTimes(1)
          expect(closeStub).toHaveBeenCalledTimes(1)
          expect(terminateSpy).not.toHaveBeenCalled()
        })

        it('should list, watch and fail', async () => {
          listStub.mockImplementation(async () => {
            return {
              metadata: {
                resourceVersion: '2'
              },
              items: [a, b]
            }
          })
          watchStub.mockImplementation(() => {
            process.nextTick(() => {
              socket.readyState = 1
              socket.emit('open')
            })
            return socket
          })
          watchHandlerStub.mockImplementation(() => {
            throw unexpectedError
          })
          await reflector.listAndWatch()
          expect(createPagerStub).toHaveBeenCalledTimes(1)
          expect(listStub).toHaveBeenCalledTimes(1)
          expect(listStub).toHaveBeenCalledTimes(1)
          expect(watchStub).toHaveBeenCalledTimes(1)
          expect(heartbeatStub).toHaveBeenCalledWith(socket)
          expect(watchHandlerStub).toHaveBeenCalledWith(socket)
          expect(closeStub).toHaveBeenCalledTimes(1)
          expect(terminateSpy).toHaveBeenCalledTimes(1)
        })
      })

      describe('#run', () => {
        it('should run list and watch until stopped', async () => {
          const listAndWatchStub = jest.spyOn(reflector, 'listAndWatch')
          listAndWatchStub.mockImplementationOnce(() => {
            throw new Error('foo')
          })
          listAndWatchStub.mockImplementationOnce(() => {
            throw new Error('bar')
          })
          listAndWatchStub.mockImplementationOnce(() => {
            reflector.stop()
          })
          await reflector.run()
          expect(listAndWatchStub).toHaveBeenCalledTimes(3)
          expect(destroyAgentSpy).toHaveBeenCalledTimes(1)
          destroyAgentSpy.mockClear()
        })

        it('should run a reflector', async () => {
          expect(reflector).toBeInstanceOf(Reflector)
          reflector.run()
          await pEvent(store, 'fresh')
          expect(store.listKeys()).toEqual(['a', 'b'])
          await pEvent(listWatcher.socket, 'open')
          // wait until message loop has been established
          await nextTick()

          // add c
          listWatcher.emitEvent({ type: 'ADDED', object: c })
          // wait until added event has been handled
          await nextTick()
          expect(store.listKeys()).toEqual(['a', 'b', 'c'])
          // close websocket connection
          listWatcher.closeWatch()
          // delete c
          listWatcher.emitEvent({ type: 'DELETED', object: c })
          // wait until deleted event has been handled
          await nextTick()
          expect(store.listKeys()).toEqual(['a', 'b'])
        })
      })
    })
  })
})
