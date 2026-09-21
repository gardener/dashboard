//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import { vi } from 'vitest'
import { PassThrough, addAbortSignal } from 'node:stream'
import { globalLogger as logger } from '@gardener-dashboard/logger'
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
    const d = createDummy({ uid: 'd', resourceVersion: '10' })
    const x = createDummy({ uid: 'a', resourceVersion: '4' })
    const bookmark = createDummy({ resourceVersion: '9' })
    const initialEventsEndBookmark = createDummy({
      resourceVersion: '9',
      annotations: { 'k8s.io/initial-events-end': 'true' },
    })

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
        this.expireOnce = false
        this.listErrors = []
        this.listOptions = []
        this.events = []
      }

      setAbortSignal (signal) {
        this.signal = signal
      }

      async list (options) {
        await nextTick()
        this.listOptions.push({ ...options })
        const error = this.listErrors.shift()
        if (error) {
          throw error
        }
        const { limit, continue: continueToken } = options
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
          if (this.expireOnce) {
            this.expiredErrorForToken = undefined
          }
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
        clearSpy = vi.spyOn(store, 'clear')
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
        const options = {
          resourceVersion: '1',
          resourceVersionMatch: 'NotOlderThan',
        }
        const { metadata, items } = await listPager.list(options)
        expect(metadata).toEqual({
          resourceVersion: '2',
          selfLink: 'link',
          paginated: true,
        })
        expect(items).toEqual([a, b])
        expect(listWatcher.listOptions).toEqual([
          {
            limit: 1,
            resourceVersion: '1',
            resourceVersionMatch: 'NotOlderThan',
          },
          {
            continue: 'b',
            limit: 1,
          },
        ])
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

      it('should return a resourceVersion for WatchList', () => {
        expect(reflector.rewatchResourceVersion).toBe('')
        reflector.lastSyncResourceVersion = '1'
        expect(reflector.rewatchResourceVersion).toBe('1')
        reflector.isLastSyncResourceVersionUnavailable = true
        expect(reflector.rewatchResourceVersion).toBe('')
      })

      it('should return mostRecentPaginated list options', () => {
        reflector = Reflector.create(listWatcher, store, {
          strategy: 'mostRecentPaginated',
          pageSize: 1,
        })
        expect(reflector.relistResourceVersion).toBe('')
        expect(reflector.relistOptions).toEqual({})
        reflector.lastSyncResourceVersion = '1'
        expect(reflector.relistOptions).toEqual({
          resourceVersion: '1',
          resourceVersionMatch: 'NotOlderThan',
        })
        reflector.isLastSyncResourceVersionUnavailable = true
        expect(reflector.relistOptions).toEqual({})
      })

      it.each([
        [null, 'The reflector options must be a plain object'],
        [[], 'The reflector options must be a plain object'],
        [{ fallback: {} }, 'Unsupported reflector option "fallback"'],
        [{ strategy: 'unsupported', pageSize: 1 }, 'Unsupported reflector strategy "unsupported"'],
        [{ strategy: 'mostRecentPaginated' }, 'The reflector option "pageSize" must be a positive safe integer'],
        [{ strategy: 'mostRecentPaginated', pageSize: 0 }, 'The reflector option "pageSize" must be a positive safe integer'],
        [{ strategy: 'mostRecentPaginated', pageSize: Number.MAX_SAFE_INTEGER + 1 }, 'The reflector option "pageSize" must be a positive safe integer'],
        [{ pageSize: 1 }, 'The reflector option "pageSize" requires a strategy'],
      ])('should reject invalid reflector options before listing', (options, message) => {
        const listStub = vi.spyOn(listWatcher, 'list')
        expect(() => Reflector.create(listWatcher, store, options)).toThrow(message)
        expect(listStub).not.toHaveBeenCalled()
        listStub.mockRestore()
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

        it('should stop at the initial events bookmark without closing an externally owned iterator', async () => {
          const temporaryStore = new Store()
          const iterator = stream[Symbol.asyncIterator]()
          const resourceVersions = []
          stream.write({ type: 'ADDED', object: a })
          stream.write({ type: 'BOOKMARK', object: initialEventsEndBookmark })
          stream.end({ type: 'ADDED', object: c })

          const result = await reflector.watchHandler(stream, 1000, {
            iterator,
            store: temporaryStore,
            exitOnWatchListBookmarkReceived: true,
            setLastSyncResourceVersion: (resourceVersion, eventReceivedBesidesAdded) => {
              if (eventReceivedBesidesAdded) {
                resourceVersions.push(resourceVersion)
              }
            },
          })

          expect(result).toEqual({
            iterator,
            watchListBookmarkReceived: true,
          })
          expect(stream.destroyed).toBe(false)
          expect(temporaryStore.listKeys()).toEqual(['a'])
          expect(store.listKeys()).toEqual([])
          expect(resourceVersions).toEqual(['9'])

          await reflector.watchHandler(stream, 1000, { iterator })
          expect(store.listKeys()).toEqual(['c'])
          expect(reflector.lastSyncResourceVersion).toBe('3')
        })
      })

      describe('#listAndWatch with WatchList', () => {
        const expiredError = new ApiErrors.StatusError({ code: 410, reason: 'Expired' })
        const tooLargeResourceVersionError = new ApiErrors.StatusError({
          code: 504,
          reason: 'Timeout',
          details: {
            causes: [{ reason: 'ResourceVersionTooLarge' }],
          },
        })
        const connectionRefusedError = Object.assign(new Error('Connection refused'), { code: 'ECONNREFUSED' })
        const tooManyRequestsError = new ApiErrors.StatusError({ code: 429 })
        const unexpectedError = new Error('Failed')

        beforeEach(() => {
          reflector.minWatchTimeout = 30
          reflector.setAbortSignal(ac.signal)
        })

        it('should publish initial events at the annotated bookmark and continue the same iterator', async () => {
          store.replace([c])
          const replaceStub = vi.spyOn(store, 'replace')
          const listStub = vi.spyOn(listWatcher, 'list')
          let stream
          let iteratorStub
          const watchStub = vi.spyOn(listWatcher, 'watch').mockImplementation(() => {
            stream = new TestStream()
            addAbortSignal(ac.signal, stream)
            iteratorStub = vi.spyOn(stream, Symbol.asyncIterator)
            return stream
          })

          const listAndWatchPromise = reflector.listAndWatch()
          await nextTick()

          expect(watchStub).toHaveBeenCalledWith({
            sendInitialEvents: true,
            allowWatchBookmarks: true,
            resourceVersion: '',
            resourceVersionMatch: 'NotOlderThan',
            timeoutSeconds: expect.toBeWithinRange(30, 60),
          })
          expect(listStub).not.toHaveBeenCalled()

          stream.write({ type: 'ADDED', object: b })
          stream.write({ type: 'ADDED', object: a })
          stream.write({ type: 'MODIFIED', object: x })
          stream.write({ type: 'DELETED', object: b })
          await vi.waitFor(() => expect(stream.readableLength).toBe(0))

          expect(store.list()).toEqual([c])
          expect(replaceStub).not.toHaveBeenCalled()
          expect(reflector.lastSyncResourceVersion).toBe('')

          stream.write({ type: 'BOOKMARK', object: initialEventsEndBookmark })
          await vi.waitFor(() => expect(replaceStub).toHaveBeenCalledTimes(1))

          expect(replaceStub).toHaveBeenCalledWith([x], '9')
          expect(reflector.lastSyncResourceVersion).toBe('9')
          expect(stream.destroyed).toBe(false)

          stream.write({ type: 'ADDED', object: d })
          await vi.waitFor(() => expect(store.list()).toEqual([x, d]))

          expect(reflector.lastSyncResourceVersion).toBe('10')
          expect(watchStub).toHaveBeenCalledTimes(1)
          expect(iteratorStub).toHaveBeenCalledTimes(1)

          ac.abort()
          await listAndWatchPromise
          replaceStub.mockRestore()
          listStub.mockRestore()
          watchStub.mockRestore()
        })

        it('should retry a continued WatchList stream returning 429 with an ordinary watch', async () => {
          const listStub = vi.spyOn(listWatcher, 'list')
          const watchListStream = new TestStream()
          const watchStub = vi.spyOn(listWatcher, 'watch')
          const backoffStub = vi.spyOn(reflector.backoffManager, 'duration').mockReturnValue(0)
          watchStub.mockReturnValueOnce(watchListStream)
          watchStub.mockImplementationOnce(() => {
            const stream = new TestStream()
            stream.end(unexpectedError)
            return stream
          })

          const listAndWatchPromise = reflector.listAndWatch()
          watchListStream.write({ type: 'ADDED', object: a })
          watchListStream.write({ type: 'BOOKMARK', object: initialEventsEndBookmark })
          await vi.waitFor(() => expect(reflector.lastSyncResourceVersion).toBe('9'))
          watchListStream.end(tooManyRequestsError)
          await listAndWatchPromise

          expect(backoffStub).toHaveBeenCalledTimes(1)
          expect(watchStub).toHaveBeenCalledTimes(2)
          expect(watchStub.mock.calls[0][0]).toEqual({
            sendInitialEvents: true,
            allowWatchBookmarks: true,
            resourceVersion: '',
            resourceVersionMatch: 'NotOlderThan',
            timeoutSeconds: expect.toBeWithinRange(30, 60),
          })
          expect(watchStub.mock.calls[1][0]).toEqual({
            allowWatchBookmarks: true,
            timeoutSeconds: expect.toBeWithinRange(30, 60),
            resourceVersion: '9',
          })
          expect(watchListStream.destroyed).toBe(true)
          expect(listStub).not.toHaveBeenCalled()
          backoffStub.mockRestore()
          listStub.mockRestore()
          watchStub.mockRestore()
        })

        it('should cancel a continued WatchList stream 429 backoff without retrying', async () => {
          const listStub = vi.spyOn(listWatcher, 'list')
          const watchListStream = new TestStream()
          const watchStub = vi.spyOn(listWatcher, 'watch').mockReturnValueOnce(watchListStream)
          const backoffStub = vi.spyOn(reflector.backoffManager, 'duration').mockReturnValue(60_000)

          const listAndWatchPromise = reflector.listAndWatch()
          watchListStream.write({ type: 'BOOKMARK', object: initialEventsEndBookmark })
          await vi.waitFor(() => expect(reflector.lastSyncResourceVersion).toBe('9'))
          watchListStream.end(tooManyRequestsError)
          await vi.waitFor(() => expect(backoffStub).toHaveBeenCalledTimes(1))
          ac.abort()
          await listAndWatchPromise

          expect(watchStub).toHaveBeenCalledTimes(1)
          expect(watchListStream.destroyed).toBe(true)
          expect(listStub).not.toHaveBeenCalled()
          backoffStub.mockRestore()
          listStub.mockRestore()
          watchStub.mockRestore()
        })

        it('should ignore unannotated bookmarks and fall back to LIST on an initialization error', async () => {
          store.replace([c])
          const replaceStub = vi.spyOn(store, 'replace')
          const watchStub = vi.spyOn(listWatcher, 'watch')
          const watchListStream = new TestStream()
          watchStub.mockReturnValueOnce(watchListStream)
          watchStub.mockImplementationOnce(() => {
            const stream = new TestStream()
            stream.end(unexpectedError)
            return stream
          })

          const listAndWatchPromise = reflector.listAndWatch()
          watchListStream.write({ type: 'ADDED', object: d })
          watchListStream.write({ type: 'BOOKMARK', object: bookmark })
          watchListStream.write({
            type: 'BOOKMARK',
            object: createDummy({
              resourceVersion: '9',
              annotations: { 'k8s.io/initial-events-end': 'false' },
            }),
          })
          await vi.waitFor(() => expect(watchListStream.readableLength).toBe(0))

          expect(store.list()).toEqual([c])
          expect(replaceStub).not.toHaveBeenCalled()
          expect(listWatcher.listOptions).toEqual([])

          watchListStream.end(unexpectedError)
          await listAndWatchPromise

          expect(listWatcher.listOptions).toEqual([{ limit: 500, resourceVersion: '0' }])
          expect(replaceStub).toHaveBeenCalledTimes(1)
          expect(replaceStub).toHaveBeenCalledWith([a, b], '2')
          expect(watchStub).toHaveBeenCalledTimes(2)
          expect(watchStub.mock.calls[1][0]).toEqual({
            allowWatchBookmarks: true,
            timeoutSeconds: expect.toBeWithinRange(30, 60),
            resourceVersion: '2',
          })
          replaceStub.mockRestore()
          watchStub.mockRestore()
        })

        it('should retry a clean premature closure with fresh temporary state', async () => {
          const replaceStub = vi.spyOn(store, 'replace')
          const listStub = vi.spyOn(listWatcher, 'list')
          const watchStub = vi.spyOn(listWatcher, 'watch')
          watchStub.mockImplementationOnce(() => {
            const stream = new TestStream()
            stream.end({ type: 'ADDED', object: d })
            return stream
          })
          watchStub.mockImplementationOnce(() => {
            const stream = new TestStream()
            stream.write({ type: 'ADDED', object: b })
            stream.write({ type: 'BOOKMARK', object: initialEventsEndBookmark })
            stream.end(unexpectedError)
            return stream
          })

          await reflector.listAndWatch()

          expect(watchStub).toHaveBeenCalledTimes(2)
          expect(listStub).not.toHaveBeenCalled()
          expect(replaceStub).toHaveBeenCalledTimes(1)
          expect(replaceStub).toHaveBeenCalledWith([b], '9')
          expect(store.list()).toEqual([b])
          replaceStub.mockRestore()
          listStub.mockRestore()
          watchStub.mockRestore()
        })

        it.each([
          ['expired', expiredError],
          ['too large', tooLargeResourceVersionError],
        ])('should retry an %s resource version with an empty resource version', async (description, error) => {
          reflector.lastSyncResourceVersion = '7'
          const listStub = vi.spyOn(listWatcher, 'list')
          const watchStub = vi.spyOn(listWatcher, 'watch')
          watchStub.mockRejectedValueOnce(error)
          watchStub.mockImplementationOnce(() => {
            const stream = new TestStream()
            stream.write({ type: 'BOOKMARK', object: initialEventsEndBookmark })
            stream.end(unexpectedError)
            return stream
          })

          await reflector.listAndWatch()

          expect(watchStub).toHaveBeenCalledTimes(2)
          expect(watchStub.mock.calls.map(([options]) => options.resourceVersion)).toEqual(['7', ''])
          expect(listStub).not.toHaveBeenCalled()
          expect(reflector.lastSyncResourceVersion).toBe('9')
          expect(reflector.isLastSyncResourceVersionUnavailable).toBe(false)
          listStub.mockRestore()
          watchStub.mockRestore()
        })

        it.each([
          ['connection-refused request', connectionRefusedError, true],
          ['429 stream', tooManyRequestsError, false],
        ])('should back off and retry a %s failure', async (description, error, rejectRequest) => {
          const listStub = vi.spyOn(listWatcher, 'list')
          const watchStub = vi.spyOn(listWatcher, 'watch')
          const backoffStub = vi.spyOn(reflector.backoffManager, 'duration').mockReturnValue(0)
          if (rejectRequest) {
            watchStub.mockRejectedValueOnce(error)
          } else {
            watchStub.mockImplementationOnce(() => {
              const stream = new TestStream()
              stream.end(error)
              return stream
            })
          }
          watchStub.mockImplementationOnce(() => {
            const stream = new TestStream()
            stream.write({ type: 'BOOKMARK', object: initialEventsEndBookmark })
            stream.end(unexpectedError)
            return stream
          })

          await reflector.listAndWatch()

          expect(backoffStub).toHaveBeenCalledTimes(1)
          expect(watchStub).toHaveBeenCalledTimes(2)
          expect(listStub).not.toHaveBeenCalled()
          expect(reflector.lastSyncResourceVersion).toBe('9')
          backoffStub.mockRestore()
          listStub.mockRestore()
          watchStub.mockRestore()
        })

        it('should cancel a WatchList without publishing partial state or listing', async () => {
          store.replace([c])
          const replaceStub = vi.spyOn(store, 'replace')
          const listStub = vi.spyOn(listWatcher, 'list')
          let stream
          const watchStub = vi.spyOn(listWatcher, 'watch').mockImplementationOnce(() => {
            stream = new TestStream()
            addAbortSignal(ac.signal, stream)
            return stream
          })

          const listAndWatchPromise = reflector.listAndWatch()
          await vi.waitFor(() => expect(watchStub).toHaveBeenCalledTimes(1))
          stream.write({ type: 'ADDED', object: d })
          await vi.waitFor(() => expect(stream.readableLength).toBe(0))
          ac.abort()
          await listAndWatchPromise

          expect(stream.destroyed).toBe(true)
          expect(listStub).not.toHaveBeenCalled()
          expect(replaceStub).not.toHaveBeenCalled()
          expect(store.list()).toEqual([c])
          replaceStub.mockRestore()
          listStub.mockRestore()
          watchStub.mockRestore()
        })

        it('should cancel WatchList backoff without retrying or listing', async () => {
          const listStub = vi.spyOn(listWatcher, 'list')
          const watchStub = vi.spyOn(listWatcher, 'watch').mockRejectedValueOnce(connectionRefusedError)
          vi.spyOn(reflector.backoffManager, 'duration').mockReturnValue(60_000)

          const listAndWatchPromise = reflector.listAndWatch()
          await vi.waitFor(() => expect(watchStub).toHaveBeenCalledTimes(1))
          ac.abort()
          await listAndWatchPromise

          expect(watchStub).toHaveBeenCalledTimes(1)
          expect(listStub).not.toHaveBeenCalled()
          listStub.mockRestore()
          watchStub.mockRestore()
        })

        describe('missing bookmark diagnostics', () => {
          beforeEach(() => {
            vi.useFakeTimers()
          })

          afterEach(() => {
            vi.useRealTimers()
          })

          it('should warn about missing events and event inactivity, then stop at the bookmark', async () => {
            const infoStub = vi.spyOn(logger, 'info').mockImplementation(() => {})
            const stream = new TestStream()
            const watchPromise = reflector.watchHandler(stream, 60_000, {
              store: new Store(),
              exitOnWatchListBookmarkReceived: true,
            })

            expect(vi.getTimerCount()).toBe(2)
            await vi.advanceTimersByTimeAsync(10_000)
            expect(infoStub).toHaveBeenCalledWith(
              '%s: awaiting required bookmark event for initial events stream, no events received for %d seconds',
              'v1, Kind=Dummy',
              10,
            )

            stream.write({ type: 'ADDED', object: a })
            await nextTick()
            await vi.advanceTimersByTimeAsync(10_000)
            expect(infoStub).toHaveBeenLastCalledWith(
              "%s: hasn't received required bookmark event marking the end of initial events stream, received last event %d seconds ago",
              'v1, Kind=Dummy',
              10,
            )

            stream.write({ type: 'BOOKMARK', object: initialEventsEndBookmark })
            await watchPromise
            expect(vi.getTimerCount()).toBe(0)

            await vi.advanceTimersByTimeAsync(20_000)
            expect(infoStub).toHaveBeenCalledTimes(2)
            stream.destroy()
          })

          it('should stop the missing-bookmark ticker on an error', async () => {
            const infoStub = vi.spyOn(logger, 'info').mockImplementation(() => {})
            const stream = new TestStream()
            const watchPromise = reflector.watchHandler(stream, 60_000, {
              store: new Store(),
              exitOnWatchListBookmarkReceived: true,
            })

            stream.end(unexpectedError)
            await expect(watchPromise).rejects.toThrow(unexpectedError)
            expect(vi.getTimerCount()).toBe(0)

            await vi.advanceTimersByTimeAsync(10_000)
            expect(infoStub).not.toHaveBeenCalled()
          })
        })
      })

      describe('#listAndWatch', () => {
        const expiredError = new ApiErrors.StatusError({ code: 410, reason: 'Expired' })
        const connectionRefusedError = Object.assign(new Error('Connection refused'), { code: 'ECONNREFUSED' })
        const tooManyRequestsError = new ApiErrors.StatusError({ code: 429 })
        const unexpectedError = new Error('Failed')
        let pager
        let createPagerStub
        let listStub
        let watchStub

        beforeEach(() => {
          reflector.minWatchTimeout = 30 // 30 seconds
          reflector.useWatchList = false
          reflector.setAbortSignal(ac.signal)
          pager = new TestPager()
          createPagerStub = vi.spyOn(ListPager, 'create').mockReturnValue(pager)
          listStub = vi.spyOn(pager, 'list')
          watchStub = vi.spyOn(listWatcher, 'watch')
        })

        afterEach(() => {
          createPagerStub.mockRestore()
          watchStub.mockRestore()
        })

        it('should list and fail', async () => {
          listStub.mockRejectedValueOnce(unexpectedError)
          await reflector.listAndWatch()
          expect(createPagerStub).toHaveBeenCalledTimes(1)
          expect(createPagerStub).toHaveBeenCalledWith(listWatcher)
          expect(listStub).toHaveBeenCalledTimes(1)
          expect(listStub.mock.calls).toEqual([
            [{ resourceVersion: '0' }],
          ])
        })

        it('should retain unconfigured relist behavior for a known resource version', async () => {
          reflector.lastSyncResourceVersion = '1'
          listStub.mockRejectedValueOnce(unexpectedError)
          await reflector.listAndWatch()
          expect(pager.pageSize).toBe(0)
          expect(listStub.mock.calls).toEqual([
            [{ resourceVersion: '1' }],
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
          const backoffStub = vi.spyOn(reflector.backoffManager, 'duration').mockReturnValue(0)
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
          expect(backoffStub).toHaveBeenCalledTimes(1)
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
          backoffStub.mockRestore()
        })

        it('should cancel watch connection backoff without retrying or relisting', async () => {
          vi.spyOn(reflector.backoffManager, 'duration').mockReturnValue(60_000)
          listStub.mockResolvedValueOnce({
            metadata: {
              resourceVersion: '2',
              paginated: true,
            },
            items: [a, b],
          })
          watchStub.mockRejectedValueOnce(connectionRefusedError)

          const listAndWatchPromise = reflector.listAndWatch()
          await vi.waitFor(() => expect(watchStub).toHaveBeenCalledTimes(1))
          ac.abort()
          await listAndWatchPromise

          expect(listStub).toHaveBeenCalledTimes(1)
          expect(watchStub).toHaveBeenCalledTimes(1)
        })

        it('should retry a watch stream returning 429 without relisting', async () => {
          const backoffStub = vi.spyOn(reflector.backoffManager, 'duration').mockReturnValue(0)
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
            stream.end(tooManyRequestsError)
            return stream
          })
          watchStub.mockImplementationOnce(() => {
            const stream = new TestStream()
            stream.end(unexpectedError)
            return stream
          })

          await reflector.listAndWatch()

          expect(backoffStub).toHaveBeenCalledTimes(1)
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
              resourceVersion: '3',
            }],
          ])
          backoffStub.mockRestore()
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

        it('should not propagate unordered added event resource versions when watching from resourceVersion 0', async () => {
          listStub.mockResolvedValueOnce({
            metadata: {
              resourceVersion: '0',
              paginated: false,
            },
            items: [],
          })
          let stream
          watchStub.mockImplementationOnce(() => {
            stream = new TestStream()
            addAbortSignal(ac.signal, stream)
            return stream
          })

          const listAndWatchPromise = reflector.listAndWatch()
          await vi.waitFor(() => expect(watchStub).toHaveBeenCalledTimes(1))

          stream.write({ type: 'ADDED', object: d })
          stream.write({ type: 'ADDED', object: a })
          await vi.waitFor(() => expect(stream.readableLength).toBe(0))
          expect(reflector.lastSyncResourceVersion).toBe('0')

          stream.write({ type: 'BOOKMARK', object: bookmark })
          await vi.waitFor(() => expect(reflector.lastSyncResourceVersion).toBe('9'))
          stream.write({ type: 'ADDED', object: d })
          await vi.waitFor(() => expect(reflector.lastSyncResourceVersion).toBe('10'))

          ac.abort()
          await listAndWatchPromise
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

      describe('#listAndWatch with mostRecentPaginated', () => {
        const expiredError = new ApiErrors.StatusError({ code: 410, reason: 'Expired' })
        const unexpectedError = new Error('Failed')
        let watchStub

        function createReflector (pageSize) {
          reflector = Reflector.create(listWatcher, store, {
            strategy: 'mostRecentPaginated',
            pageSize,
          })
          reflector.minWatchTimeout = 30
          reflector.useWatchList = false
          reflector.setAbortSignal(ac.signal)
          watchStub = vi.spyOn(listWatcher, 'watch').mockImplementationOnce(() => {
            const stream = new TestStream()
            stream.end(unexpectedError)
            return stream
          })
        }

        afterEach(() => {
          watchStub?.mockRestore()
        })

        it('should paginate the initial list without a resource version', async () => {
          createReflector(1)

          await reflector.listAndWatch()

          expect(listWatcher.listOptions).toEqual([
            { limit: 1 },
            { continue: 'b', limit: 1 },
          ])
          expect(watchStub).toHaveBeenCalledWith({
            allowWatchBookmarks: true,
            timeoutSeconds: expect.toBeWithinRange(30, 60),
            resourceVersion: '2',
          })
        })

        it('should preserve bounded pagination after WatchList fallback', async () => {
          reflector = Reflector.create(listWatcher, store, {
            strategy: 'mostRecentPaginated',
            pageSize: 1,
          })
          reflector.minWatchTimeout = 30
          reflector.setAbortSignal(ac.signal)
          watchStub = vi.spyOn(listWatcher, 'watch')
          watchStub.mockImplementationOnce(() => {
            const stream = new TestStream()
            stream.end(unexpectedError)
            return stream
          })
          watchStub.mockImplementationOnce(() => {
            const stream = new TestStream()
            stream.end(unexpectedError)
            return stream
          })

          await reflector.listAndWatch()

          expect(listWatcher.listOptions).toEqual([
            { limit: 1 },
            { continue: 'b', limit: 1 },
          ])
          expect(watchStub).toHaveBeenCalledTimes(2)
          expect(watchStub.mock.calls[1][0]).toEqual({
            allowWatchBookmarks: true,
            timeoutSeconds: expect.toBeWithinRange(30, 60),
            resourceVersion: '2',
          })
        })

        it('should paginate a relist from a known resource version', async () => {
          createReflector(2)
          reflector.lastSyncResourceVersion = '1'

          await reflector.listAndWatch()

          expect(listWatcher.listOptions).toEqual([{
            limit: 2,
            resourceVersion: '1',
            resourceVersionMatch: 'NotOlderThan',
          }])
          expect(watchStub).toHaveBeenCalledWith({
            allowWatchBookmarks: true,
            timeoutSeconds: expect.toBeWithinRange(30, 60),
            resourceVersion: '2',
          })
        })

        it('should recover successfully with a fresh paginated list', async () => {
          createReflector(2)
          reflector.lastSyncResourceVersion = '1'
          listWatcher.listErrors.push(expiredError)

          await reflector.listAndWatch()

          expect(listWatcher.listOptions).toEqual([
            {
              limit: 2,
              resourceVersion: '1',
              resourceVersionMatch: 'NotOlderThan',
            },
            { limit: 2 },
          ])
          expect(store.listKeys()).toEqual(['a', 'b'])
          expect(watchStub).toHaveBeenCalledTimes(1)
        })

        it('should discard partial pages and restart an expired continuation', async () => {
          createReflector(1)
          reflector.lastSyncResourceVersion = '1'
          listWatcher.expiredErrorForToken = 'b'
          listWatcher.expireOnce = true
          const replaceStub = vi.spyOn(store, 'replace')

          await reflector.listAndWatch()

          expect(listWatcher.listOptions).toEqual([
            {
              limit: 1,
              resourceVersion: '1',
              resourceVersionMatch: 'NotOlderThan',
            },
            { continue: 'b', limit: 1 },
            { limit: 1 },
            { continue: 'b', limit: 1 },
          ])
          expect(replaceStub).toHaveBeenCalledTimes(1)
          expect(replaceStub).toHaveBeenCalledWith([a, b], '2')
          expect(watchStub).toHaveBeenCalledWith({
            allowWatchBookmarks: true,
            timeoutSeconds: expect.toBeWithinRange(30, 60),
            resourceVersion: '2',
          })
          replaceStub.mockRestore()
        })
      })

      describe('#run', () => {
        it('should cancel restart backoff without restarting', async () => {
          vi.spyOn(reflector.backoffManager, 'duration').mockReturnValue(60_000)
          const listAndWatchStub = vi.spyOn(reflector, 'listAndWatch').mockResolvedValueOnce()
          const infoStub = vi.spyOn(logger, 'info').mockImplementation(() => {})
          const errorStub = vi.spyOn(logger, 'error').mockImplementation(() => {})

          const runPromise = reflector.run(ac.signal)
          await vi.waitFor(() => expect(listAndWatchStub).toHaveBeenCalledTimes(1))
          ac.abort()
          await runPromise

          expect(listAndWatchStub).toHaveBeenCalledTimes(1)
          expect(infoStub).not.toHaveBeenCalledWith('Restarting reflector %s', reflector.expectedTypeName)
          expect(errorStub).not.toHaveBeenCalled()
          infoStub.mockRestore()
          errorStub.mockRestore()
        })

        it('should run list and watch until stopped', async () => {
          const backoffStub = vi.spyOn(reflector.backoffManager, 'duration').mockReturnValue(0)
          const listAndWatchStub = vi.spyOn(reflector, 'listAndWatch')
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
          expect(backoffStub).toHaveBeenCalledTimes(2)
        })

        it('should run a reflector', async () => {
          expect(reflector).toBeInstanceOf(Reflector)
          reflector.useWatchList = false
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
