//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
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

function registerHandler (emitter, handler) {
  emitter.on('connect', () => {
    logger.debug('watch %s connected', emitter.resourceName)
  })
  emitter.on('disconnect', err => {
    logger.error('watch %s disconnected', emitter.resourceName, err)
  })
  emitter.on('reconnect', (n, delay) => {
    logger.debug('watch %s reconnect attempt %d after %d', emitter.resourceName, n, delay)
  })
  emitter.on('error', err => {
    logger.error('watch %s error occurred', emitter.resourceName, err)
  })
  emitter.on('event', (event) => {
    const type = event.type
    if (events.includes(type)) {
      if (type !== 'ERROR') {
        handler(event)
      } else {
        const status = event.object
        logger.error('ERROR: Code "%s", Reason "%s", message "%s, watch: %s"', status.code, status.reason, status.message, emitter.resourceName)
      }
    }
  })
}
exports.registerHandler = registerHandler
