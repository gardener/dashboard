//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { jest } from '@jest/globals'
import { Store } from '../lib/cache/index.js'

describe('kube-client', () => {
  describe('cache', () => {
    const a = { uid: 1, value: 'a' }
    const b = { uid: 2, value: 'b' }
    const x = { uid: 1, value: 'x' }

    describe('Store', () => {
      let store
      let clearSpy

      beforeEach(() => {
        store = new Store({ keyPath: 'uid' })
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
        expect(store.getByKey(1)).toBe(a)
        expect(store.list()).toEqual([a])

        // add b
        store.add(b)
        expect(store.listKeys()).toEqual([1, 2])

        // update a
        store.update(x)
        expect(store.listKeys()).toEqual([1, 2])
        expect(store.getByKey(1)).toBe(x)

        // delete b
        store.delete(b)
        expect(store.listKeys()).toEqual([1])

        // delete by key
        store.deleteByKey(1)
        expect(store.listKeys()).toHaveLength(0)
      })

      it('should find an element', async () => {
        const a = { uid: 1, bool: false, num: 1, str: 'a' }
        const b = { uid: 2, bool: true, num: 2, str: 'b' }
        const c = { uid: 3, bool: true, num: 3, str: 'c' }
        store.replace([a, b, c])
        await store.untilHasSynced
        expect(store.find('bool')).toBe(b)
        expect(store.find(['num', 1])).toBe(a)
        expect(store.find({ str: 'c' })).toBe(c)
        expect(store.find(({ uid }) => uid === 2)).toBe(b)
        expect(() => store.find()).toThrow(TypeError)
      })
    })
  })
})
