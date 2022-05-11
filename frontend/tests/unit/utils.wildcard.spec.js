//
// SPDX-FileCopyrightText: 2022 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { wildcardObjectsFromStrings, bestMatchForString } from '@/utils/wildcard'

describe('utils', () => {
  describe('wildcard', () => {
    const wildcardStrings = ['Foo*', '*Bar', '*Barz*', '*', 'Bar', 'FooBar', 'FooB*']
    const wildcardObjects = wildcardObjectsFromStrings(wildcardStrings)

    describe('wildcardObjectsFromStrings', () => {
      it('should transform to wildcard object', () => {
        expect(wildcardObjects.length).toBe(7)
        const wildcardObject = wildcardObjects[0]
        expect(wildcardObject.value).toEqual('Foo')
        expect(wildcardObject.originalValue).toEqual('Foo*')
      })

      it('should detect endsWithWildcard', () => {
        const wildcardObject = wildcardObjects[0]
        expect(wildcardObject.value).toEqual('Foo')
        expect(wildcardObject.isWildcard).toBe(true)
        expect(wildcardObject.endsWithWildcard).toBe(true)
        expect(wildcardObject.startsWithWildcard).toBe(false)
        expect(wildcardObject.customWildcard).toBe(false)
        expect(wildcardObject.test('Foo__')).toBe(true)
        expect(wildcardObject.test('__Foo__')).toBe(false)
        expect(wildcardObject.test('Foo')).toBe(false)
        expect(wildcardObject.test('x')).toBe(false)
      })

      it('should detect startsWithWildcard', () => {
        const wildcardObject = wildcardObjects[1]
        expect(wildcardObject.value).toEqual('Bar')
        expect(wildcardObject.isWildcard).toBe(true)
        expect(wildcardObject.startsWithWildcard).toBe(true)
        expect(wildcardObject.endsWithWildcard).toBe(false)
        expect(wildcardObject.customWildcard).toBe(false)
        expect(wildcardObject.test('__Bar')).toBe(true)
        expect(wildcardObject.test('__Bar__')).toBe(false)
        expect(wildcardObject.test('Bar')).toBe(false)
        expect(wildcardObject.test('x')).toBe(false)
      })

      it('should detect startsWithWildcard and endsWithWildcard', () => {
        const wildcardObject = wildcardObjects[2]
        expect(wildcardObject.value).toEqual('Barz')
        expect(wildcardObject.isWildcard).toBe(true)
        expect(wildcardObject.startsWithWildcard).toBe(true)
        expect(wildcardObject.endsWithWildcard).toBe(true)
        expect(wildcardObject.customWildcard).toBe(false)
        expect(wildcardObject.test('__Barz')).toBe(false)
        expect(wildcardObject.test('Barz__')).toBe(false)
        expect(wildcardObject.test('__Barz__')).toBe(true)
        expect(wildcardObject.test('Barz')).toBe(false)
        expect(wildcardObject.test('x')).toBe(false)
      })

      it('should detect customWildcard', () => {
        const wildcardObject = wildcardObjects[3]
        expect(wildcardObject.value).toEqual('')
        expect(wildcardObject.isWildcard).toBe(true)
        expect(wildcardObject.startsWithWildcard).toBe(false)
        expect(wildcardObject.endsWithWildcard).toBe(false)
        expect(wildcardObject.customWildcard).toBe(true)
        expect(wildcardObject.test('__Bar')).toBe(true)
        expect(wildcardObject.test('__Bar__')).toBe(true)
        expect(wildcardObject.test('Bar')).toBe(true)
        expect(wildcardObject.test('x')).toBe(true)
      })

      it('should detect non wildcard', () => {
        const wildcardObject = wildcardObjects[4]
        expect(wildcardObject.value).toEqual('Bar')
        expect(wildcardObject.isWildcard).toBe(false)
        expect(wildcardObject.startsWithWildcard).toBe(false)
        expect(wildcardObject.endsWithWildcard).toBe(false)
        expect(wildcardObject.customWildcard).toBe(false)
        expect(wildcardObject.test('__Bar')).toBe(false)
        expect(wildcardObject.test('__Bar__')).toBe(false)
        expect(wildcardObject.test('Bar')).toBe(true)
        expect(wildcardObject.test('x')).toBe(false)
      })
    })

    describe('bestMatchForString', () => {
      it('should prefer exact match', () => {
        const match = bestMatchForString(wildcardObjects, 'FooBar')
        expect(match).toEqual(wildcardObjects[5])
      })
      it('should match wildcard', () => {
        const match = bestMatchForString(wildcardObjects, 'FooFoo')
        expect(match).toEqual(wildcardObjects[0])
      })
      it('should prefer longest match', () => {
        const match = bestMatchForString(wildcardObjects, 'FooBaz')
        expect(match).toEqual(wildcardObjects[6])
      })
    })
  })
})
