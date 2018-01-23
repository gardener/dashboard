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

const logger = require('../logger')

const events = [
  'ADDED',
  'MODIFIED',
  'DELETED',
  'ERROR'
]
exports.events = events

const namespacedResources = [
  'shoots'
]
exports.namespacedResources = namespacedResources

function registerHandler (watch, handler) {
  watch.on('connect', () => {
    logger.debug('watch connected', watch.resourceName)
  })
  watch.on('disconnect', err => {
    logger.error('watch disconnected', watch.resourceName, err)
  })
  watch.on('reconnect', (n, delay) => {
    logger.debug('watch reconnect attempt %s %d after %d', watch.resourceName, n, delay)
  })
  watch.on('error', err => {
    logger.error('watch error', err, watch.resourceName)
  })
  watch.on('event', (event) => {
    const type = event.type
    if (events.includes(type)) {
      if (type !== 'ERROR') {
        const metadata = event.object.metadata
        const name = metadata.name
        logger.debug('%s %s: %s', type, watch.resourceKind, name)
        handler(event)
      } else {
        const status = event.object
        logger.error('ERROR: Code "%s", Reason "%s", message "%s, watch: %s"', status.code, status.reason, status.message, watch.resourceName)
      }
    }
  })
}
exports.registerHandler = registerHandler
