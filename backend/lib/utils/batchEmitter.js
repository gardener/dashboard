
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
const logger = require('../logger')

class AbstractBatchEmitter {
  constructor (kind, socket) {
    this.kind = kind
    this.socket = socket
    this.clearData()

    this.MAX_CHUNK_SIZE = 50
    this.MIN_CHUNK_SIZE = 10
  }
  batchEmitObjectsAndFlush (objects) {
    this.batchEmitObjects(objects)
    this.flush()
  }
  batchEmitObjects (objects) {
    _.forEach(_.chunk(objects, this.MAX_CHUNK_SIZE), (chunkedObjects) => {
      this.appendChunk(chunkedObjects)
      if (this.count() >= this.MIN_CHUNK_SIZE) {
        this.socket.emit('batchEvent', {kind: this.kind, type: 'ADDED', data: this.chunk})
        this.clearData()
      }
    })
  }
  flush () {
    if (this.count() !== 0) {
      this.socket.emit('batchEvent', {kind: this.kind, type: 'ADDED', data: this.chunk})
    }
    logger.debug('Emitted %s batch events to socket %s', this.kind, this.socket.id)
  }

  /**
   * abstract methods
   */
  count () {
    throw new Error('You have to implement the method!')
  }
  appendChunk (chunkedObjects) {
    throw new Error('You have to implement the method!')
  }
  clearData () {
    throw new Error('You have to implement the method!')
  }
}

class ArrayBatchEmitter extends AbstractBatchEmitter {
  count () {
    return _.size(this.chunk)
  }
  appendChunk (chunkedObjects) {
    this.chunk = _.concat(this.chunk, chunkedObjects)
  }
  clearData () {
    this.chunk = []
  }
}

class NamespacedBatchEmitter extends AbstractBatchEmitter {
  batchEmitObjects (objects, namespace) {
    this.currentBatchNamespace = namespace
    super.batchEmitObjects(objects)
  }
  count () {
    return _.chain(this.chunk).map(objects => objects.length).sum().value()
  }
  appendChunk (chunkedObjects) {
    this.chunk[this.currentBatchNamespace] = chunkedObjects
  }
  clearData () {
    this.chunk = {}
  }
}

module.exports = {
  ArrayBatchEmitter,
  NamespacedBatchEmitter
}
