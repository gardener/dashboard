//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { join } = require('path')
const { EventEmitter } = require('events')
const pEvent = require('p-event')
const kubeClient = jest.requireActual('@gardener-dashboard/kube-client')
const { http } = jest.requireActual('@gardener-dashboard/kube-client/lib/symbols')
const { WatchBuilder } = kubeClient

class MockWatch extends EventEmitter {
  constructor (resource, url, searchParams, name = '') {
    super()
    this.pseudoHeaders = {
      ...resource[http.client].pseudoHeaders
    }
    this.pseudoHeaders[':path'] = join(this.pseudoHeaders[':path'], url, name)
    this.searchParams = searchParams
    this.resourceName = name
    this.disconnected = false
    WatchBuilder.setWaitFor(this)
    // add to mockWatches map
    const key = this.key
    if (mockWatches.has(key)) {
      throw new TypeError(`MockWatch with key ${key} already exists`)
    }
    mockWatches.set(key, this)
    mockWatchEmitter.emit(key, this)
  }

  disconnect () {
    this.disconnected = true
    this.removeAllListeners()
    // delete from mockWatches map
    const key = this.key
    mockWatches.delete(key)
  }

  get key () {
    return this.pseudoHeaders[':path']
  }
}

const mockWatches = new Map()
const mockWatchEmitter = new EventEmitter()

WatchBuilder.create = jest.fn((...args) => new MockWatch(...args))

module.exports = {
  ...kubeClient,
  getMockWatch (key) {
    if (mockWatches.has(key)) {
      return Promise.resolve(mockWatches.get(key))
    }
    return pEvent(mockWatchEmitter, key, {
      timeout: 100
    })
  }
}
