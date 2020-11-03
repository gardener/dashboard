//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const EventEmitter = require('events')
const { get, matches, matchesProperty, property, isPlainObject } = require('lodash')

const store = Symbol('store')
const timeout = Symbol('timeout')
const keyPath = Symbol('keyPath')
const keyFunc = Symbol('keyFunc')
const timeoutId = Symbol('timeoutId')
const state = Symbol('state')

const defaultTimeout = 10 * 1000

const FRESH = 'FRESH'
const REFRESHING = 'REFRESHING'
const STALE = 'STALE'

/*
  The Store has three possible states (STALE, FRESH and REFRESHING).
  The initial state of the store is STALE.
  The store is FRESH when `replace` is called. This is allowed from any other state.
  When a refresh (the `listWandWatch` method of the reflector is called) of the store is triggered
  (e.g. because the watch has been closed or the connection has been lost) the `setRefreshing` method is called.
  But a transition to REFRESHING is only possible from FRESH and not from STALE.
  If no `replace` is called within the given timeout the store will become STALE.
  From STALE the only possible transition is to FRESH by calling `replace`.
*/
class Store extends EventEmitter {
  constructor (map, options = {}) {
    super()
    this[store] = map || new Map()
    this[state] = STALE
    this[timeoutId] = undefined
    this[timeout] = get(options, 'timeout', defaultTimeout)
    this[keyPath] = get(options, 'keyPath', 'metadata.uid')
  }

  [keyFunc] (object) {
    return get(object, this[keyPath])
  }

  get isFresh () {
    return this[state] !== STALE
  }

  setRefreshing () {
    if (this[state] === FRESH) {
      this[state] = REFRESHING
      clearTimeout(this[timeoutId])
      this[timeoutId] = setTimeout(() => {
        this[state] = STALE
        this.emit('stale')
      }, this[timeout])
    }
  }

  listKeys () {
    return Array.from(this[store].keys())
  }

  list () {
    return Array.from(this[store].values())
  }

  clear () {
    this[store].clear()
  }

  delete (object) {
    const key = this[keyFunc](object)
    this[store].delete(key)
  }

  getByKey (key) {
    return this[store].get(key)
  }

  get (object) {
    const key = this[keyFunc](object)
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
    for (const object of this[store].values()) {
      if (predicate(object)) {
        return object
      }
    }
  }

  hasByKey (key) {
    return this[store].has(key)
  }

  has (object) {
    const key = this[keyFunc](object)
    return this.hasByKey(key)
  }

  add (object) {
    const key = this[keyFunc](object)
    this[store].set(key, object)
  }

  update (object) {
    const key = this[keyFunc](object)
    this[store].set(key, object)
  }

  replace (items) {
    clearTimeout(this[timeoutId])
    this.clear()
    for (const object of items) {
      const key = this[keyFunc](object)
      this[store].set(key, object)
    }
    this[state] = FRESH
    this.emit('fresh')
  }
}

module.exports = Store
