//
// SPDX-FileCopyrightText: 2025 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { isClass } from '../lib/isClass.js'

describe('isClass', () => {
  it('should return true for a class', () => {
    class MyClass {}
    expect(isClass(MyClass)).toBe(true)
  })

  it('should return false for a regular function', () => {
    function myFunction () {}
    expect(isClass(myFunction)).toBe(false)
  })

  it('should return false for an arrow function', () => {
    const myArrowFunction = () => {}
    expect(isClass(myArrowFunction)).toBe(false)
  })

  it('should return false for an object', () => {
    const myObject = {}
    expect(isClass(myObject)).toBe(false)
  })

  it('should return false for a primitive value', () => {
    expect(isClass(42)).toBe(false)
    expect(isClass('string')).toBe(false)
    expect(isClass(true)).toBe(false)
    expect(isClass(null)).toBe(false)
    expect(isClass(undefined)).toBe(false)
  })

  it('should return false for a function without a prototype', () => {
    const noPrototypeFunction = Object.create(null)
    expect(isClass(noPrototypeFunction)).toBe(false)
  })

  it('should return false for a bound function', () => {
    class MyClass {}
    const boundFunction = MyClass.bind(null)
    expect(isClass(boundFunction)).toBe(false)
  })

  it('should return false for a proxy-wrapped class', () => {
    class MyClass {}
    const proxyClass = new Proxy(MyClass, {})
    expect(isClass(proxyClass)).toBe(false)
  })

  it('should handle tampered toString method gracefully', () => {
    class MyClass {}
    MyClass.toString = () => 'function tampered() {}'
    expect(isClass(MyClass)).toBe(true)
  })
})
