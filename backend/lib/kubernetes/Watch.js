//
// Copyright 2018 by The Gardener Authors.
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

const _ = require('lodash')
const inject = require('reconnect-core')
const { EventEmitter } = require('events')
const EventStream = require('./EventStream')

class Watch extends EventEmitter {
  constructor (client, options = {}, resource) {
    super()
    const reconnectOptions = _.assign({
      initialDelay: 1e2,
      maxDelay: 60e3,
      strategy: 'fibonacci',
      failAfter: Infinity,
      randomisationFactor: 0,
      immediate: false
    }, options)
    const json = true
    const watch = true
    const reconnect = inject((url) => {
      const eventStream = new EventStream()
      client
        .request({url, json})
        .then(({metadata}) => {
          const resourceVersion = metadata.resourceVersion
          return client
            .defaultRequest({url, qs: {watch, resourceVersion}})
            .on('socket', () => eventStream.emit('connect'))
            .on('error', (err) => eventStream.emit('error', err))
            .pipe(eventStream)
        })
        .catch((err) => eventStream.emit('error', err))
      return eventStream
    })
    const reconnector = reconnect(reconnectOptions, (eventStream) => {
      eventStream.on('readable', () => {
        let event
        while ((event = eventStream.read())) {
          try {
            this.emit('event', event)
          } catch (err) {
            this.emit('error', err)
          }
        }
      })
    })
    reconnector.on('connect', (connection) => this.emit('connect', connection))
    reconnector.on('disconnect', (err) => this.emit('disconnect', err))
    reconnector.on('reconnect', (n, delay) => this.emit('reconnect', n, delay))
    reconnector.on('error', (err) => this.emit('error', err))
    this.reconnector = reconnector
    this.resourceName = resource.name
    this.resourceKind = resource.kind
  }
  connect (url) {
    this.reconnector.connect(url)
    return this
  }
}

module.exports = Watch
