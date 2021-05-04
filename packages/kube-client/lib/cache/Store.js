//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { get, matches, matchesProperty, property, isPlainObject } = require('lodash')

const kMap = Symbol('map')
const kKeyPath = Symbol('keyPath')
const kKeyFunc = Symbol('keyFunc')
const kHasSynced = Symbol('hasSynced')
const kResolve = Symbol('resolve')

class Store {
  constructor ({ keyPath = 'metadata.uid' } = {}) {
    this[kMap] = new Map()
    this[kKeyPath] = keyPath
    this[kHasSynced] = false
    const untilHasSynced = new Promise(resolve => {
      this[kResolve] = () => {
        this[kHasSynced] = true
        resolve()
      }
    })
    Reflect.defineProperty(this, 'untilHasSynced', { value: untilHasSynced })
  }

  [kKeyFunc] (object) {
    return get(object, this[kKeyPath])
  }

  get hasSynced () {
    return this[kHasSynced]
  }

  listKeys () {
    return Array.from(this[kMap].keys())
  }

  list () {
    return Array.from(this[kMap].values())
  }

  clear () {
    this[kMap].clear()
  }

  getKey (object) {
    return this[kKeyFunc](object)
  }

  getByKey (key) {
    return this[kMap].get(key)
  }

  get (object) {
    const key = this[kKeyFunc](object)
    return this.getByKey(key)
  }

  find (predicate) {
    if (typeof predicate === 'string') {
      predicate = property(predicate)
    } else if (Array.isArray(predicate)) {
      predicate = matchesProperty(...predicate)
    } else if (isPlainObject(predicate)) {
      predicate = matches(predicate)
    } else if (typeof predicate !== 'function') {
      throw new TypeError('Invalid predicate argument')
    }
    for (const object of this[kMap].values()) {
      if (predicate(object)) {
        return object
      }
    }
  }

  hasByKey (key) {
    return this[kMap].has(key)
  }

  has (object) {
    const key = this[kKeyFunc](object)
    return this.hasByKey(key)
  }

  set (object) {
    const key = this[kKeyFunc](object)
    this[kMap].set(key, object)
  }

  add (object) {
    this.set(object)
  }

  update (object) {
    this.set(object)
  }

  deleteByKey (key) {
    this[kMap].delete(key)
  }

  delete (object) {
    const key = this[kKeyFunc](object)
    this[kMap].delete(key)
  }

  replace (items) {
    this.clear()
    for (const object of items) {
      const key = this[kKeyFunc](object)
      this[kMap].set(key, object)
    }
    if (this[kResolve]) {
      this[kResolve]()
      this[kResolve] = undefined
    }
  }
}

module.exports = Store
