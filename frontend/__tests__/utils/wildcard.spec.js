//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  wildcardObjectsFromStrings,
  bestMatchForString,
} from '@/utils/wildcard'

describe('utils', () => {
  describe('wildcard', () => {
    const wildcardStrings = ['Foo*', '*Bar', '*Barz*', '*', 'Bar', 'FooBar', 'FooB*']
    const wildcardObjects = wildcardObjectsFromStrings(wildcardStrings)

    describe('wildcardObjectsFromStrings', () => {
      it('should transform to wildcard object', () => {
        expect(wildcardObjects.length).toBe(7)
        const wildcardObject = wildcardObjects[0]
        expect(wildcardObject.value).toBe('Foo')
        expect(wildcardObject.originalValue).toBe('Foo*')
      })

      it('should detect endsWithWildcard', () => {
        const wildcardObject = wildcardObjects[0]
        expect(wildcardObject.value).toBe('Foo')
        expect(wildcardObject.isWildcard).toBe(true)
        expect(wildcardObject.endsWithWildcard).toBe(true)
        expect(wildcardObject.startsWithWildcard).toBe(false)
        expect(wildcardObject.customWildcard).toBe(false)
        expect(wildcardObject.test('Foo__')).toBe(true)
        expect(wildcardObject.test('__Foo__')).toBe(false)
        expect(wildcardObject.test('Foo')).toBe(true)
        expect(wildcardObject.test('x')).toBe(false)
      })

      it('should detect startsWithWildcard', () => {
        const wildcardObject = wildcardObjects[1]
        expect(wildcardObject.value).toBe('Bar')
        expect(wildcardObject.isWildcard).toBe(true)
        expect(wildcardObject.startsWithWildcard).toBe(true)
        expect(wildcardObject.endsWithWildcard).toBe(false)
        expect(wildcardObject.customWildcard).toBe(false)
        expect(wildcardObject.test('__Bar')).toBe(true)
        expect(wildcardObject.test('__Bar__')).toBe(false)
        expect(wildcardObject.test('Bar')).toBe(true)
        expect(wildcardObject.test('x')).toBe(false)
      })

      it('should detect startsWithWildcard and endsWithWildcard', () => {
        const wildcardObject = wildcardObjects[2]
        expect(wildcardObject.value).toBe('Barz')
        expect(wildcardObject.isWildcard).toBe(true)
        expect(wildcardObject.startsWithWildcard).toBe(true)
        expect(wildcardObject.endsWithWildcard).toBe(true)
        expect(wildcardObject.customWildcard).toBe(false)
        expect(wildcardObject.test('__Barz')).toBe(true)
        expect(wildcardObject.test('Barz__')).toBe(true)
        expect(wildcardObject.test('__Barz__')).toBe(true)
        expect(wildcardObject.test('Barz')).toBe(true)
        expect(wildcardObject.test('x')).toBe(false)
      })

      it('should detect customWildcard', () => {
        const wildcardObject = wildcardObjects[3]
        expect(wildcardObject.value).toBe('')
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
        expect(wildcardObject.value).toBe('Bar')
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
        let match = bestMatchForString(wildcardObjects, 'FooBar')
        expect(match).toEqual(wildcardObjects[5])

        match = bestMatchForString(wildcardObjects, 'Bar')
        expect(match).toEqual(wildcardObjects[4])
      })
      it('should match wildcard with variable part', () => {
        let match = bestMatchForString(wildcardObjects, 'FooFoo')
        expect(match).toEqual(wildcardObjects[0])

        match = bestMatchForString(wildcardObjects, 'Fooa')
        expect(match).toEqual(wildcardObjects[0])
      })
      it('should match wildcard without variable part', () => {
        let match = bestMatchForString(wildcardObjects, 'Foo')
        expect(match).toEqual(wildcardObjects[0])

        match = bestMatchForString(wildcardObjects, 'FooB')
        expect(match).toEqual(wildcardObjects[6])
      })
      it('should match wildcard start', () => {
        const match = bestMatchForString(wildcardObjects, 'aBar')
        expect(match).toEqual(wildcardObjects[1])
      })
      it('should match wildcard both', () => {
        const match = bestMatchForString(wildcardObjects, 'aBarza')
        expect(match).toEqual(wildcardObjects[2])
      })
      it('should match custom wildcard', () => {
        const match = bestMatchForString(wildcardObjects, 'a')
        expect(match).toEqual(wildcardObjects[3])
      })
      it('should prefer longest match', () => {
        const match = bestMatchForString(wildcardObjects, 'FooBaz')
        expect(match).toEqual(wildcardObjects[6])
      })
    })
  })
})
