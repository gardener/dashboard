
//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'
const _ = require('lodash')
const logger = require('../logger')

class AbstractBatchEmitter {
  constructor ({ kind, socket, objectKeyPath = undefined, eventsKind }) {
    this.eventsKind = eventsKind
    this.kind = kind
    this.socket = socket
    this.objectKeyPath = objectKeyPath
    this.clearData()

    this.MAX_CHUNK_SIZE = 50
    this.MIN_CHUNK_SIZE = 10
  }

  batchEmitObjectsAndFlush (...args) {
    this.batchEmitObjects(...args)
    this.flush()
  }

  batchEmitObjects (objects) {
    _
      .chain(objects)
      .map(object => {
        const event = { type: 'ADDED', object }
        if (this.objectKeyPath) {
          event.objectKey = _.get(object, this.objectKeyPath) // objectKey used for throttling events on frontend (discard previous events for one batch for same objectKey)
        }
        return event
      })
      .chunk(this.MAX_CHUNK_SIZE)
      .forEach(chunkedEvents => {
        this.appendChunkedEvents(chunkedEvents)
        if (this.count() >= this.MIN_CHUNK_SIZE) {
          this.emit()
          this.clearData()
        }
      })
      .value()
  }

  flush () {
    if (this.count() !== 0) {
      this.emit()
    }
    logger.debug('Emitted %s batch events to socket %s', this.kind, this.socket.id)
  }

  /**
   * abstract methods
   */
  emit () {
    throw new Error('You have to implement the method!')
  }

  count () {
    throw new Error('You have to implement the method!')
  }

  appendChunkedEvents (chunkedEvents) {
    throw new Error('You have to implement the method!')
  }

  clearData () {
    throw new Error('You have to implement the method!')
  }
}

class EventsEmitter extends AbstractBatchEmitter {
  constructor ({ kind, socket, objectKeyPath = undefined }) {
    super({ kind, socket, objectKeyPath, eventsKind: 'events' })
  }

  emit () {
    this.socket.emit(this.eventsKind, { kind: this.kind, events: this.events })
  }

  count () {
    return _.size(this.events)
  }

  appendChunkedEvents (chunkedEvents) {
    this.events = _.concat(this.events, chunkedEvents)
  }

  clearData () {
    this.events = []
  }
}

class NamespacedBatchEmitter extends AbstractBatchEmitter {
  constructor ({ kind, socket, objectKeyPath = undefined }) {
    super({ kind, socket, objectKeyPath, eventsKind: 'namespacedEvents' })
  }

  batchEmitObjects (objects, namespace) {
    this.currentBatchNamespace = namespace
    super.batchEmitObjects(objects)
  }

  emit () {
    this.socket.emit(this.eventsKind, { kind: this.kind, namespaces: this.namespaces })
  }

  count () {
    return _
      .chain(this.namespaces)
      .map(events => events.length)
      .sum()
      .value()
  }

  appendChunkedEvents (chunkedEvents) {
    this.namespaces[this.currentBatchNamespace] = _
      .chain(this.namespaces)
      .get(this.currentBatchNamespace, [])
      .concat(chunkedEvents)
      .value()
  }

  clearData () {
    this.namespaces = {}
  }
}

module.exports = {
  AbstractBatchEmitter,
  EventsEmitter,
  NamespacedBatchEmitter
}
