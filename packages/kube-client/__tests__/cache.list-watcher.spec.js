//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { vi } from 'vitest'
import { ListWatcher } from '../lib/cache/index.js'
import { Foo } from './fixtures/resources.js'

describe('kube-client', () => {
  describe('cache', () => {
    describe('ListWatcher', () => {
      let listFunc
      let body
      let watchFunc
      let stream
      const query = { a: 1 }
      let listWatcher

      beforeEach(() => {
        body = {}
        listFunc = vi.fn(() => body)
        stream = {}
        watchFunc = vi.fn(() => stream)
        listWatcher = new ListWatcher(listFunc, watchFunc, Foo, query)
      })

      it('#constructor', () => {
        expect(listWatcher.group).toBe(Foo.group)
        expect(listWatcher.version).toBe(Foo.version)
        expect(listWatcher.names).toEqual(Foo.names)
        expect(listWatcher.searchParams.toString()).toBe('a=1')
      })

      it('#setAbortSignal', () => {
        const signal = {}
        listWatcher.setAbortSignal(signal)
        expect(listWatcher.signal).toBe(signal)
      })

      it('#list', () => {
        expect(listWatcher.list({ b: 2 })).toBe(body)
        expect(listFunc).toHaveBeenCalledTimes(1)
        expect(listFunc.mock.calls[0]).toEqual([{
          searchParams: new URLSearchParams({ a: 1, b: 2 }),
        }])
      })

      it('#list with signal', () => {
        const signal = {}
        listWatcher.setAbortSignal(signal)
        expect(listWatcher.list({ b: 2 })).toBe(body)
        expect(listFunc).toHaveBeenCalledTimes(1)
        expect(listFunc.mock.calls[0]).toEqual([{
          signal,
          searchParams: new URLSearchParams({ a: 1, b: 2 }),
        }])
      })

      it('#watch', () => {
        const signal = {}
        listWatcher.setAbortSignal(signal)
        expect(listWatcher.watch({ b: 2 })).toBe(stream)
        expect(watchFunc).toHaveBeenCalledTimes(1)
        expect(watchFunc.mock.calls[0]).toEqual([{
          signal,
          searchParams: new URLSearchParams({ a: 1, b: 2 }),
        }])
      })
    })
  })
})
