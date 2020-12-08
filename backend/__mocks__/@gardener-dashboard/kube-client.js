//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { EventEmitter } = require('events')
const kubeClient = jest.requireActual('@gardener-dashboard/kube-client')
const { WatchBuilder } = kubeClient

const implementationSymbol = Symbol('implementation')
const mockWatches = new Map()

WatchBuilder.create = jest.fn((resource, ...rest) => {
  const mockWatch = mockWatches.get(resource.constructor.names.plural)
  if (mockWatch && typeof mockWatch[implementationSymbol] === 'function') {
    process.nextTick(async () => {
      try {
        await mockWatch[implementationSymbol](mockWatch)
      } catch (err) { /* ignore error */ }
    })
  }
  return mockWatch
})

function createMockWatch (key) {
  const mockWatch = new EventEmitter()
  mockWatch.resourceName = key
  WatchBuilder.setWaitFor(mockWatch)
  mockWatch.disconnect = jest.fn()
  mockWatch.mockImplementation = implementation => {
    mockWatch[implementationSymbol] = implementation
  }
  mockWatches.set(key, mockWatch)
  return mockWatch
}

module.exports = {
  ...kubeClient,
  mockWatches,
  createMockWatch
}
