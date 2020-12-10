//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { EventEmitter } = require('events')
const kubeClient = jest.requireActual('@gardener-dashboard/kube-client')
const { WatchBuilder } = kubeClient

WatchBuilder.create = jest.fn((resource, url, searchParams, name) => {
  const mockWatch = new EventEmitter()
  mockWatch.resourceName = resource.constructor.names.plural
  WatchBuilder.setWaitFor(mockWatch)
  mockWatch.disconnect = jest.fn()
  const key = Reflect
    .ownKeys(resource)
    .find(key => typeof key === 'symbol' && key.description === 'http.client')
  const httpClient = resource[key]
  const options = {
    method: 'get',
    searchParams: new URLSearchParams(searchParams.toString())
  }
  options.searchParams.set('watch', true)
  if (name) {
    let fieldSelector = `metadata.name=${name}`
    if (searchParams.has('fieldSelector')) {
      fieldSelector += ',' + searchParams.get('fieldSelector')
    }
    options.searchParams.set('fieldSelector', fieldSelector)
  }
  const stream = httpClient.request(url, options)
  process.nextTick(async () => {
    let data
    for await (const chunk of stream) {
      data = Buffer.isBuffer(data)
        ? Buffer.concat([data, chunk], data.length + chunk.length)
        : chunk
      let index
      while ((index = data.indexOf(10)) !== -1) {
        const event = JSON.parse(data.slice(0, index))
        mockWatch.emit('event', event)
        data = data.slice(index + 1)
      }
    }
    // flush
    if (Buffer.isBuffer(data) && data.length) {
      const event = JSON.parse(data)
      mockWatch.emit('event', event)
    }
    mockWatch.disconnect()
  })
  return mockWatch
})

module.exports = kubeClient
