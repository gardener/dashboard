//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const EventEmitter = require('events')
const Reflector = require('./Reflector')
const Store = require('./Store')

const kReflector = Symbol('reflector')
const kAbortController = Symbol('abortController')
const kStore = Symbol('store')

class Informer extends EventEmitter {
  constructor (listWatcher, { keyPath } = {}) {
    super()
    this[kAbortController] = new AbortController()
    const store = this[kStore] = new Store({ keyPath })
    const emitter = this
    this[kReflector] = Reflector.create(listWatcher, {
      replace (items, resourceVersion) {
        const events = new Map()
        for (const key of store.listKeys()) {
          const object = store.getByKey(key)
          events.set(key, ['delete', object])
        }
        for (const newObject of items) {
          const key = store.getKey(newObject)
          if (!events.has(key)) {
            events.set(key, ['add', newObject])
          } else {
            const oldObject = store.get(newObject)
            events.set(key, ['update', newObject, oldObject])
          }
        }
        store.replace(items, resourceVersion)
        for (const args of events.values()) {
          emitter.emit(...args)
        }
      },
      addOrUpdate (newObject) {
        const oldObject = store.get(newObject)
        if (oldObject) {
          store.update(newObject)
          emitter.emit('update', newObject, oldObject)
        } else {
          store.add(newObject)
          emitter.emit('add', newObject)
        }
      },
      add (newObject) {
        this.addOrUpdate(newObject)
      },
      update (newObject) {
        this.addOrUpdate(newObject)
      },
      delete (object) {
        store.delete(object)
        emitter.emit('delete', object)
      }
    })
  }

  get names () {
    return this[kReflector].names
  }

  get store () {
    return this[kStore]
  }

  get hasSynced () {
    return this[kStore].hasSynced
  }

  get lastSyncResourceVersion () {
    return this[kReflector].lastSyncResourceVersion
  }

  abort () {
    this[kAbortController].abort()
  }

  run (signal) {
    if (signal instanceof AbortSignal) {
      signal.addEventListener('abort', () => this.abort(), { once: true })
    }
    this[kReflector].run(this[kAbortController].signal)
  }

  static create (...args) {
    return new this(...args)
  }
}

module.exports = Informer
