//
// Copyright (c) 2019 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

'use strict'

const EventEmitter = require('events')
const { get } = require('lodash')

const store = Symbol('store')
const timeout = Symbol('timeout')
const keyPath = Symbol('keyPath')
const keyFunc = Symbol('keyFunc')
const timeoutId = Symbol('timeoutId')
const synchronized = Symbol('synchronized')

class Store extends EventEmitter {
  constructor (map, options = {}) {
    super()
    this[store] = map || new Map()
    this[synchronized] = false
    this[timeoutId] = undefined
    this[timeout] = get(options, 'timeout', 30000)
    this[keyPath] = get(options, 'keyPath', 'metadata.uid')
  }

  [keyFunc] (object) {
    return get(object, this[keyPath])
  }

  get isSynchronized () {
    return this[synchronized]
  }

  synchronizing () {
    this[timeoutId] = setTimeout(() => {
      this[synchronized] = false
      this.emit('stale')
    }, this[timeout])
  }

  listKeys () {
    return Array.from(this[store].keys())
  }

  list () {
    return Array.from(this[store].values())
  }

  clear () {
    this[store].clear()
    this.emit('cleared')
  }

  delete (object) {
    const key = this[keyFunc](object)
    this[store].delete(key)
    this.emit('deleted', object)
  }

  getByKey (key) {
    return this[store].get(key)
  }

  get (object) {
    const key = this[keyFunc](object)
    return this.getByKey(key)
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
    this.emit('added', object)
  }

  update (object) {
    const key = this[keyFunc](object)
    this[store].set(key, object)
    this.emit('updated', object)
  }

  replace (items) {
    this.clear()
    for (const object of items) {
      const key = this[keyFunc](object)
      this[store].set(key, object)
    }
    clearTimeout(this[timeoutId])
    this[synchronized] = true
    this.emit('replaced')
  }
}

module.exports = Store
