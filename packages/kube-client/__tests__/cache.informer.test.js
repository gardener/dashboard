//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { jest } from '@jest/globals'
import { Informer, ListWatcher, Store, Reflector } from '../lib/cache/index.js'
import { Foo } from '../__fixtures__/resources.js'

describe('kube-client', () => {
  describe('cache', () => {
    const a = { uid: 1, value: 'a' }
    const b = { uid: 2, value: 'b' }
    const c = { uid: 3, value: 'c' }
    const x = { uid: 1, value: 'x' }
    const y = { uid: 2, value: 'y' }
    const z = { uid: 3, value: 'z' }

    describe('Informer', () => {
      let listFunc
      let watchFunc
      let externalAbortController
      let listWatcher
      let informer
      let internalAbortController
      let store
      let reflector

      beforeEach(() => {
        externalAbortController = new AbortController()
        listFunc = jest.fn()
        watchFunc = jest.fn()
        listWatcher = new ListWatcher(listFunc, watchFunc, Foo)
        informer = Informer.createTestingInformer(listWatcher, { keyPath: 'uid' })
        informer.emit = jest.fn()
        internalAbortController = informer.abortController
        internalAbortController.abort = jest.fn()
        store = informer.store
        reflector = informer.reflector
        reflector.run = jest.fn()
      })

      it('should create, run and abort an informer', async () => {
        expect(store).toBeInstanceOf(Store)
        expect(reflector).toBeInstanceOf(Reflector)
        expect(internalAbortController).toBeInstanceOf(AbortController)
        expect(informer.names).toEqual(Foo.names)
        expect(informer.store).toBe(store)
        expect(informer.hasSynced).toBe(store.hasSynced)
        expect(informer.lastSyncResourceVersion).toBe(reflector.lastSyncResourceVersion)
        informer.run(externalAbortController.signal)
        expect(reflector.run).toHaveBeenCalledTimes(1)
        expect(reflector.run.mock.calls[0]).toHaveLength(1)
        expect(reflector.run.mock.calls[0][0]).toBe(internalAbortController.signal)
        externalAbortController.abort()
        expect(internalAbortController.abort).toHaveBeenCalledTimes(1)
      })

      it('should replace store data', async () => {
        reflector.store.replace([a, b, c])
        expect(store.list()).toEqual([a, b, c])
        expect(informer.emit).toHaveBeenCalledTimes(3)
        expect(informer.emit.mock.calls).toEqual([
          ['add', a],
          ['add', b],
          ['add', c],
        ])
        informer.emit.mockClear()

        reflector.store.delete(c)
        expect(store.list()).toEqual([a, b])
        expect(informer.emit).toHaveBeenCalledTimes(1)
        expect(informer.emit.mock.calls).toEqual([
          ['delete', c],
        ])
        informer.emit.mockClear()

        reflector.store.add(x)
        expect(store.list()).toEqual([x, b])
        expect(informer.emit).toHaveBeenCalledTimes(1)
        expect(informer.emit.mock.calls).toEqual([
          ['update', x, a],
        ])
        informer.emit.mockClear()

        reflector.store.update(y)
        expect(store.list()).toEqual([x, y])
        expect(informer.emit).toHaveBeenCalledTimes(1)
        expect(informer.emit.mock.calls).toEqual([
          ['update', y, b],
        ])
        informer.emit.mockClear()

        reflector.store.update(z)
        expect(store.list()).toEqual([x, y, z])
        expect(informer.emit).toHaveBeenCalledTimes(1)
        expect(informer.emit.mock.calls).toEqual([
          ['add', z],
        ])
        informer.emit.mockClear()

        reflector.store.replace([a, b])
        expect(store.list()).toEqual([a, b])
        expect(informer.emit).toHaveBeenCalledTimes(3)
        expect(informer.emit.mock.calls).toEqual([
          ['update', a, x],
          ['update', b, y],
          ['delete', z],
        ])
        informer.emit.mockClear()
      })
    })
  })
})
