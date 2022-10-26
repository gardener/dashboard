//
// SPDX-FileCopyrightText: 2022 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

import EventEmitter from 'eventemitter3'

class StorageWrapper extends EventEmitter {
  #storage

  constructor (storage) {
    super()
    this.#storage = storage
  }

  equals (storageArea) {
    return this.#storage === storageArea
  }

  get length () {
    return this.#storage.length
  }

  clear () {
    this.#storage.clear()
    this.emit('change', null)
  }

  getItem (key) {
    return this.#storage.getItem(key)
  }

  key (index) {
    return this.#storage.key(index)
  }

  setItem (key, value) {
    const oldValue = this.getItem(key)
    if (value !== oldValue) {
      this.#storage.setItem(key, value)
      this.emit('change', key, value, oldValue)
    }
  }

  removeItem (key, value) {
    const oldValue = this.getItem(key)
    if (oldValue !== null) {
      this.#storage.removeItem(key)
      this.emit('change', key, null, oldValue)
    }
  }

  setObject (key, value) {
    this.setItem(key, JSON.stringify(value))
  }

  getObject (key) {
    const value = this.getItem(key)
    if (value) {
      try {
        return JSON.parse(value)
      } catch (err) { /* ignore error */ }
    }
  }
}

export default function createStorageWrapper (storage = window.localStorage) {
  return new StorageWrapper(storage)
}
