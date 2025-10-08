//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import EventEmitter from 'events'
import Reflector from './Reflector.js'
import Store from './Store.js'

class Informer extends EventEmitter {
  #reflector
  #abortController = new AbortController()
  #store

  constructor (listWatcher, { keyPath } = {}) {
    super()
    const store = this.#store = new Store({ keyPath })
    const emitter = this
    this.#reflector = Reflector.create(listWatcher, {
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
      },
    })
  }

  get names () {
    return this.#reflector.names
  }

  get store () {
    return this.#store
  }

  get hasSynced () {
    return this.#store.hasSynced
  }

  get lastSyncResourceVersion () {
    return this.#reflector.lastSyncResourceVersion
  }

  abort () {
    this.#abortController.abort()
  }

  run (signal) {
    if (signal instanceof AbortSignal) {
      signal.addEventListener('abort', () => this.abort(), { once: true })
    }
    this.#reflector.run(this.#abortController.signal)
  }

  static create (...args) {
    return new this(...args)
  }

  static createTestingInformer (...args) {
    const informer = new this(...args)
    return Object.defineProperties(informer, {
      reflector: {
        get () {
          return informer.#reflector
        },
      },
      store: {
        get () {
          return informer.#store
        },
      },
      abortController: {
        get () {
          return informer.#abortController
        },
      },
    })
  }
}

export default Informer
