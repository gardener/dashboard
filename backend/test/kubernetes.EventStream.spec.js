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

const EventStream = require('../lib/kubernetes/EventStream')

describe('kubernetes', function () {
  /* eslint no-unused-expressions: 0 */

  describe('EventStream', function () {
    const encoding = 'utf8'
    const event = {
      a: 42
    }
    const newline = '\n'
    const chunk = JSON.stringify(event) + newline

    let eventStream
    let pushBytesSpy
    let shiftEventSpy

    beforeEach(function () {
      eventStream = new EventStream()
      pushBytesSpy = sinon.spy(eventStream, 'pushBytes')
      shiftEventSpy = sinon.spy(eventStream, 'shiftEvent')
    })

    describe('#pushBytes', function () {
      it('should push an utf8 string to the data buffer', function () {
        eventStream.pushBytes(chunk, encoding)
        expect(eventStream.buffer.toString(encoding)).to.equal(chunk)
      })
      it('should push parts of an utf8 string and null to the data buffer', function () {
        eventStream.pushBytes(chunk.substring(0, 5), encoding)
        eventStream.pushBytes()
        eventStream.pushBytes(chunk.substring(5), encoding)
        expect(eventStream.buffer.toString(encoding)).to.equal(chunk)
      })
      it('should push a buffer to the data buffer', function () {
        eventStream.pushBytes(Buffer.from(chunk, encoding), 'buffer')
        expect(eventStream.buffer.toString(encoding)).to.equal(chunk)
      })
    })

    describe('#shiftEvent', function () {
      it('should return exactly one event', function () {
        eventStream.pushBytes(chunk, encoding)
        expect(eventStream.shiftEvent()).to.eql(event)
        expect(eventStream.shiftEvent()).to.be.undefined
      })
    })

    describe('#write', function () {
      it('should emit exactly two events', function (done) {
        const events = []
        eventStream.write(chunk, encoding)
        eventStream.write(Buffer.from(chunk, encoding), 'buffer')
        eventStream.end()
        eventStream.on('readable', () => {
          let event
          while ((event = eventStream.read())) {
            events.push(event)
          }
        })
        eventStream.on('end', () => {
          expect(pushBytesSpy).have.callCount(2)
          expect(shiftEventSpy).have.callCount(4)
          expect(events).to.have.length(2)
          expect(events).to.eql([event, event])
          done()
        })
        eventStream.on('error', done)
      })

      it('should ignore invalid JSON', function (done) {
        const events = []
        eventStream.write('{"a": 42', encoding)
        eventStream.write(newline, encoding)
        eventStream.write(Buffer.from(chunk, encoding), 'buffer')
        eventStream.end()
        eventStream.on('readable', () => {
          let event
          while ((event = eventStream.read())) {
            events.push(event)
          }
        })
        eventStream.on('end', () => {
          expect(pushBytesSpy).have.callCount(3)
          expect(events).to.have.length(1)
          expect(events).to.eql([event])
          done()
        })
        eventStream.on('error', done)
      })
    })
  })
})
