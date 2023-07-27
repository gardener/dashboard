//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { hash, md5 } from '@/utils/crypto'

function md5JSON (value = null) {
  return md5(JSON.stringify(value))
}

describe('utils', () => {
  describe('hash', () => {
    const kKey = Symbol('key')
    const kValue = Symbol('value')

    it('should create the same hash for two different objects', () => {
      const obj1 = {
        d: true,
        a: 1,
        c: null,
        e: undefined,
        b: ['2', 5, null, { z: 4, x: 3, y: false }],
        f: { 1: 'a', 3: 'c', 2: 'b' },
        [kKey]: 'key',
        s: kValue,
        run () {},
      }
      const obj2 = {
        a: 1,
        b: ['2', 5, null, { x: 3, y: false, z: 4 }],
        c: null,
        d: true,
        f: { 1: 'a', 2: 'b', 3: 'c' },
      }
      expect(hash(obj1)).toBe(hash(obj2))
    })

    it('should create hashes for string values', () => {
      const values = ['string', '', '☕']
      for (const value of values) {
        expect(hash(value)).toBe(md5JSON(value))
      }
    })

    it('should create hashes for boolean values', () => {
      const values = [true, false]
      for (const value of values) {
        expect(hash(value)).toBe(md5JSON(value))
      }
    })

    it('should create hashes for number values', () => {
      const values = [-1, 0, 1, 2.34, NaN, Infinity, Number.MAX_SAFE_INTEGER]
      for (const value of values) {
        expect(hash(value)).toBe(md5JSON(value))
      }
    })

    it('should create hashes for Set instances', () => {
      const array = [3, null, 2, undefined, 1]
      const set = new Set(array)
      expect(hash(array)).toBe(hash(set))
    })

    it('should create hashes for Map instances', () => {
      const obj = { a: 2, b: undefined, c: null, d: 0, e: false, f: '' }
      const map = new Map(Object.entries(obj))
      expect(hash(obj)).toBe(hash(map))
    })

    it('should create hashes for invalid values', () => {
      const values = [undefined, kValue, () => {}]
      const expectedHash = md5('')
      for (const value of values) {
        expect(hash(value)).toBe(expectedHash)
      }
    })
  })
})
