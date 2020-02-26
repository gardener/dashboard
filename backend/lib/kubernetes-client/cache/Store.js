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
const moment = require('moment')

const store = Symbol('store')
const timeout = Symbol('timeout')
const timeoutId = Symbol('timeoutId')
const synchronized = Symbol('synchronized')

class Store extends EventEmitter {
  constructor (map) {
    super()
    this[store] = map || new Map()
    this[synchronized] = false
    this[timeout] = moment.duration(30, 'seconds')
    this[timeoutId] = undefined
  }

  get isSynchronized () {
    return this[synchronized]
  }

  resynchronizing () {
    this[timeoutId] = setTimeout(() => {
      this[synchronized] = false
      this.emit('stale')
    }, this[timeout].asMilliseconds())
  }

  keys () {
    return Array.from(this[store].keys())
  }

  values () {
    return Array.from(this[store].values())
  }

  getObjectKey (object, defaultValue) {
    return get(object, 'metadata.uid', defaultValue)
  }

  get (objectOrKey) {
    const key = this.getObjectKey(objectOrKey, objectOrKey)
    return this[store].get(key)
  }

  set (object) {
    const key = this.getObjectKey(object)
    this[store].set(key, object)
  }

  has (objectOrKey) {
    const key = this.getObjectKey(objectOrKey, objectOrKey)
    return this[store].has(key)
  }

  clear () {
    this[store].clear()
    this.emit('cleared')
  }

  delete (object) {
    const key = this.getObjectKey(object)
    const result = this[store].delete(key)
    this.emit('deleted', object)
    return result
  }

  add (object) {
    this.set(object)
    this.emit('added', object)
  }

  update (object) {
    this.set(object)
    this.emit('updated', object)
  }

  replace (items) {
    this.clear()
    for (const object of items) {
      this.set(object)
    }
    clearTimeout(this[timeoutId])
    this[synchronized] = true
    this.emit('replaced')
  }
}

module.exports = Store
