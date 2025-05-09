//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { get, matches, matchesProperty, property, isPlainObject } from 'lodash-es'

class Store {
  #map = new Map()
  #keyPath = 'metadata.uid'
  #hasSynced = false
  #resolve = undefined

  constructor (options) {
    this.#map = new Map()
    if (options?.keyPath) {
      this.#keyPath = options.keyPath
    }
    const untilHasSynced = new Promise(resolve => {
      this.#resolve = () => {
        this.#hasSynced = true
        resolve()
      }
    })
    Reflect.defineProperty(this, 'untilHasSynced', { value: untilHasSynced })
  }

  #keyFunc (object) {
    return get(object, this.#keyPath)
  }

  get hasSynced () {
    return this.#hasSynced
  }

  listKeys () {
    return Array.from(this.#map.keys())
  }

  list () {
    return Array.from(this.#map.values())
  }

  clear () {
    this.#map.clear()
  }

  getKey (object) {
    return this.#keyFunc(object)
  }

  getByKey (key) {
    return this.#map.get(key)
  }

  get (object) {
    const key = this.#keyFunc(object)
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
    for (const object of this.#map.values()) {
      if (predicate(object)) {
        return object
      }
    }
  }

  hasByKey (key) {
    return this.#map.has(key)
  }

  has (object) {
    const key = this.#keyFunc(object)
    return this.hasByKey(key)
  }

  set (object) {
    const key = this.#keyFunc(object)
    this.#map.set(key, object)
  }

  add (object) {
    this.set(object)
  }

  update (object) {
    this.set(object)
  }

  deleteByKey (key) {
    this.#map.delete(key)
  }

  delete (object) {
    const key = this.#keyFunc(object)
    this.#map.delete(key)
  }

  replace (items) {
    this.clear()
    for (const object of items) {
      const key = this.#keyFunc(object)
      this.#map.set(key, object)
    }
    if (this.#resolve) {
      this.#resolve()
      this.#resolve = undefined
    }
  }
}

export default Store
