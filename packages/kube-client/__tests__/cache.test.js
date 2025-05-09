//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { jest } from '@jest/globals'
import { PassThrough, addAbortSignal } from 'node:stream'
import * as ApiErrors from '../lib/ApiErrors.js'
import { Reflector, Store, ListPager } from '../lib/cache/index.js'
const nextTick = () => new Promise(resolve => process.nextTick(resolve))

describe('kube-client', () => {
  describe('cache', () => {
    let map
    let store
    let listWatcher

    function createDummy (metadata) {
      return {
        apiVersion: 'v1',
        kind: 'Dummy',
        metadata: { ...metadata },
      }
    }

    const a = createDummy({ uid: 'a', resourceVersion: '1' })
    const b = createDummy({ uid: 'b', resourceVersion: '2' })
    const c = createDummy({ uid: 'c', resourceVersion: '3' })
    const x = createDummy({ uid: 'a', resourceVersion: '4' })
    const bookmark = createDummy({ resourceVersion: '9' })

    class TestStream extends PassThrough {
      constructor () {
        super({ objectMode: true })
      }
    }

    class TestPager {
      constructor () {
        this.pageSize = 7
      }

      list () {
        return {
          metadata: {
            resourceVersion: '1',
          },
          items: [],
        }
      }
    }

    class TestListWatcher {
      constructor () {
        this.group = ''
        this.version = 'v1'
        this.names = {
          kind: 'Dummy',
          plural: 'dummies',
        }
        this.stream = undefined
        this.expiredErrorForToken = undefined
        this.events = []
      }

      setAbortSignal (signal) {
        this.signal = signal
      }

      async list ({ limit, continue: continueToken }) {
        await nextTick()
        const metadata = {
          resourceVersion: '2',
          selfLink: 'link',
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
            message: 'Resource is expired',
          })
        }
        if (continueToken === 'b') {
          return {
            metadata: {},
            items: [b],
          }
        }
        throw new Error('Unexpected continue token')
      }

      watch (options) {
        this.stream = new TestStream()
        if (this.signal) {
          addAbortSignal(this.signal, this.stream)
        }
        while (this.events.length) {
          this.stream.write(this.events.shift())
        }
        return this.stream
      }

      emitEvent (event) {
        if (this.stream) {
          this.stream.write(event)
        } else {
          this.events.push(event)
        }
      }

      closeWatch () {
        this.stream.end()
        this.stream = undefined
      }
    }

    beforeEach(() => {
      map = new Map()
      store = new Store(map, { timeout: 1 })
      listWatcher = new TestListWatcher()
    })

    describe('Store', () => {
      let clearSpy

      beforeEach(() => {
        clearSpy = jest.spyOn(store, 'clear')
      })

      it('should add, update and delete elements', async () => {
        expect(store).toBeInstanceOf(Store)
        expect(store.hasSynced).toBe(false)

        // replace [a]
        store.replace([a])
        await store.untilHasSynced
        expect(store.hasSynced).toBe(true)
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
          paginated: true,
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
          selfLink: 'link',
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
          expect(ApiErrors.isExpiredError(err)).toBe(true)
        }
        listPager.fullListIfExpired = true
        const { metadata, items } = await listPager.list(options)
        expect(metadata).toEqual({
          resourceVersion: '2',
          selfLink: 'link',
          paginated: true,
        })
        expect(items).toEqual([a, b])
      })
    })

    describe('Reflector', () => {
      let ac
      let reflector

      beforeEach(() => {
        ac = new AbortController()
        reflector = Reflector.create(listWatcher, store)
        reflector.backoffManager.min = 1
        reflector.backoffManager.max = 10
      })

      afterEach(() => {
        ac.abort()
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

      describe('#watchHandler', () => {
        let stream

        function emitEvent (event, ms) {
          setTimeout(() => stream.write(event), ms)
        }

        beforeEach(() => {
          stream = new TestStream()
        })

        it('should handle watch events', async () => {
          const error = { code: 410, reason: 'Expired' }

          emitEvent({ type: 'ADDED', object: a }, 1)
          emitEvent({ type: 'ADDED', object: b }, 2)
          emitEvent({ type: 'MODIFIED', object: b }, 3)
          emitEvent({ type: 'DELETED', object: a }, 5)
          emitEvent({ type: 'BOOKMARK', object: bookmark }, 6)
          emitEvent({ type: 'ERROR', object: error }, 7)

          emitEvent({ type: 'INVALID' }, 4)
          emitEvent({ type: 'ADDED', object: {} }, 4)
          emitEvent({ type: 'PATCHED', object: a }, 4)

          expect.assertions(3)
          try {
            await reflector.watchHandler(stream, 1000)
          } catch (err) {
            expect(ApiErrors.isExpiredError(err)).toBe(true)
          }
          expect(reflector.lastSyncResourceVersion).toBe('9')
          expect(store.listKeys()).toEqual(['b'])
        })

        it('should destroy the watch after 5', async () => {
          emitEvent({ type: 'ADDED', object: a }, 1)
          emitEvent({ type: 'ADDED', object: b }, 2)
          await expect(reflector.watchHandler(stream, 5)).rejects.toThrow(/^Forcefully destroying watch .+ after 5 ms$/)

          expect(reflector.lastSyncResourceVersion).toBe('2')
          expect(store.listKeys()).toEqual(['a', 'b'])
        })
      })

      describe('#listAndWatch', () => {
        const expiredError = new ApiErrors.StatusError({ code: 410, reason: 'Expired' })
        const connectionRefusedError = Object.assign(new Error('Connection refused'), { code: 'ECONNREFUSED' })
        const unexpectedError = new Error('Failed')
        let pager
        let createPagerStub
        let listStub
        let watchStub

        beforeEach(() => {
          reflector.minWatchTimeout = 30 // 30 seconds
          reflector.setAbortSignal(ac.signal)
          pager = new TestPager()
          createPagerStub = jest.spyOn(ListPager, 'create').mockReturnValue(pager)
          listStub = jest.spyOn(pager, 'list')
          watchStub = jest.spyOn(listWatcher, 'watch')
        })

        it('should list and fail', async () => {
          listStub.mockRejectedValueOnce(unexpectedError)
          await reflector.listAndWatch()
          expect(createPagerStub).toHaveBeenCalledTimes(1)
          expect(listStub).toHaveBeenCalledTimes(1)
          expect(listStub.mock.calls).toEqual([
            [{ resourceVersion: '0' }],
          ])
        })

        it('should list, fall back to resourceVersion="" and fail', async () => {
          listStub.mockRejectedValueOnce(expiredError)
          listStub.mockRejectedValueOnce(unexpectedError)
          await reflector.listAndWatch()
          expect(createPagerStub).toHaveBeenCalledTimes(1)
          expect(listStub).toHaveBeenCalledTimes(2)
          expect(listStub.mock.calls).toEqual([
            [{ resourceVersion: '0' }],
            [{ resourceVersion: '' }],
          ])
        })

        it('should list, retry to start watching and fail', async () => {
          listStub.mockResolvedValueOnce({
            metadata: {
              resourceVersion: '2',
              paginated: true,
            },
            items: [a, b],
          })
          watchStub.mockRejectedValueOnce(connectionRefusedError)
          watchStub.mockImplementationOnce(() => {
            const stream = new TestStream()
            stream.end(expiredError)
            return Promise.resolve(stream)
          })

          await reflector.listAndWatch()
          expect(createPagerStub).toHaveBeenCalledTimes(1)
          expect(listStub).toHaveBeenCalledTimes(1)
          expect(watchStub).toHaveBeenCalledTimes(2)
          expect(watchStub.mock.calls).toEqual([
            [{
              allowWatchBookmarks: true,
              timeoutSeconds: expect.toBeWithinRange(30, 60),
              resourceVersion: '2',
            }],
            [{
              allowWatchBookmarks: true,
              timeoutSeconds: expect.toBeWithinRange(30, 60),
              resourceVersion: '2',
            }],
          ])
          expect(store.listKeys()).toEqual(['a', 'b'])
        })

        it('should list, start watching and exit', async () => {
          listStub.mockResolvedValueOnce({
            metadata: {
              resourceVersion: '2',
              paginated: true,
            },
            items: [a, b],
          })
          watchStub.mockImplementationOnce(() => {
            const stream = new TestStream()
            addAbortSignal(ac.signal, stream)
            stream.write({ type: 'ADDED', object: c })
            setImmediate(() => ac.abort())
            return Promise.resolve(stream)
          })

          await reflector.listAndWatch()
          expect(createPagerStub).toHaveBeenCalledTimes(1)
          expect(listStub).toHaveBeenCalledTimes(1)
          expect(watchStub).toHaveBeenCalledTimes(1)
          expect(store.listKeys()).toEqual(['a', 'b', 'c'])
        })

        it('should list, watch and fail', async () => {
          listStub.mockResolvedValueOnce({
            metadata: {
              resourceVersion: '2',
              paginated: true,
            },
            items: [a, b],
          })
          watchStub.mockImplementationOnce(() => {
            const stream = new TestStream()
            stream.write({ type: 'ADDED', object: c })
            stream.end(unexpectedError)
            return Promise.resolve(stream)
          })

          await reflector.listAndWatch()
          expect(createPagerStub).toHaveBeenCalledTimes(1)
          expect(listStub).toHaveBeenCalledTimes(1)
          expect(watchStub).toHaveBeenCalledTimes(1)
          expect(store.listKeys()).toEqual(['a', 'b', 'c'])
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
            ac.abort()
          })
          await reflector.run(ac.signal)
          expect(listAndWatchStub).toHaveBeenCalledTimes(3)
        })

        it('should run a reflector', async () => {
          expect(reflector).toBeInstanceOf(Reflector)
          reflector.run(ac.signal)
          await store.untilHasSynced
          expect(store.listKeys()).toEqual(['a', 'b'])
          // add c
          listWatcher.emitEvent({ type: 'ADDED', object: c })
          // wait until added event has been handled
          await nextTick()
          expect(store.listKeys()).toEqual(['a', 'b', 'c'])
          // close websocket connection
          listWatcher.closeWatch()
          await nextTick()
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
