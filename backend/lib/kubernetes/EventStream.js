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

const { Transform } = require('stream')
const logger = require('../logger')

class EventStream extends Transform {
  constructor () {
    super({
      readableObjectMode: true
    })
    this.buffer = Buffer.alloc(0)
  }

  pushBytes (chunk, encoding) {
    if (!chunk) {
      return
    }
    if (encoding !== 'buffer') {
      chunk = Buffer.from(chunk, encoding)
    }
    this.buffer = Buffer.concat([this.buffer, chunk])
  }

  shiftEvent () {
    if (!this.buffer.length) {
      return
    }
    const end = this.buffer.indexOf(10)
    if (end !== -1) {
      const rawEvent = this.buffer.slice(0, end)
      this.buffer = this.buffer.slice(end + 1)
      try {
        return JSON.parse(rawEvent)
      } catch (err) {
        logger.error('Error parsing event:', err)
        logger.debug(`-> Invalid JSON: ${rawEvent}`)
      }
    }
  }

  _transform (chunk, encoding, done) {
    this.pushBytes(chunk, encoding)
    let event
    while ((event = this.shiftEvent())) {
      this.push(event)
    }
    done()
  }
}

module.exports = EventStream
