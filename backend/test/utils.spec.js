//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const EventEmitter = require('events')
const { AssertionError } = require('assert').strict
const { encodeBase64, decodeBase64, getConfigValue, shootHasIssue, getSeedNameFromShoot } = require('../lib/utils')
const { AbstractBatchEmitter, EventsEmitter, NamespacedBatchEmitter } = require('../lib/utils/batchEmitter')

describe('utils', function () {
  /* eslint no-unused-expressions: 0 */
  const sandbox = sinon.createSandbox()

  afterEach(function () {
    sandbox.restore()
  })

  describe('index', function () {
    it('should base64 encode some values', function () {
      expect(encodeBase64()).to.be.undefined
      expect(encodeBase64('')).to.be.undefined
      expect(encodeBase64('foo')).to.equal('Zm9v')
    })

    it('should base64 decode some values', function () {
      expect(decodeBase64()).to.be.undefined
      expect(decodeBase64('')).to.be.undefined
      expect(decodeBase64('Zm9v')).to.equal('foo')
    })

    it('should return some config values with defaults', function () {
      expect(() => getConfigValue('test')).to.throw(AssertionError)
      expect(getConfigValue('logLevel')).to.equal('info')
    })

    it('should return if a shoot has issues', function () {
      const shoot = {
        metadata: {
          labels: {
            'shoot.gardener.cloud/status': undefined
          }
        }
      }
      expect(shootHasIssue(shoot)).to.be.false
      shoot.metadata.labels['shoot.gardener.cloud/status'] = 'healthy'
      expect(shootHasIssue(shoot)).to.be.false
      shoot.metadata.labels['shoot.gardener.cloud/status'] = 'unhealthy'
      expect(shootHasIssue(shoot)).to.be.true
    })

    it('should return the seed name for a shoot resource', function () {
      expect(() => getSeedNameFromShoot({})).to.throw(AssertionError)
      const shoot = {
        spec: {
          seedName: 'foo'
        },
        status: {
          seed: 'bar'
        }
      }
      expect(getSeedNameFromShoot(shoot)).to.equal('foo')
    })
  })

  describe('batchEmitter', function () {
    const kind = 'foo'
    const socket = new EventEmitter()
    const objectKeyPath = 'id'
    const notImplemented = 'You have to implement the method!'

    class TestEmitter extends AbstractBatchEmitter {
      clearData () {
        try {
          super.clearData()
        } catch (err) {
          this.socket.emit('error', err)
        }
      }
    }

    beforeEach(function () {
      socket.removeAllListeners()
    })

    it('should ensure abstract methods throw an error', function () {
      let message
      socket.once('error', err => {
        message = err.message
      })
      const emitter = new TestEmitter({ kind, socket, objectKeyPath })
      expect(message).to.equal(notImplemented)
      expect(() => emitter.emit()).to.throw(notImplemented)
      expect(() => emitter.count()).to.throw(notImplemented)
      expect(() => emitter.appendChunkedEvents()).to.throw(notImplemented)
    })

    it('should emit events in batches', function () {
      const chunks = []
      const emitter = new EventsEmitter({ kind, socket, objectKeyPath })
      emitter.MIN_CHUNK_SIZE = 2
      emitter.MAX_CHUNK_SIZE = 3
      socket.on('events', ({ events }) => {
        const chunk = events.map(event => event.objectKey)
        chunks.push(chunk)
      })
      emitter.batchEmitObjects([
        { id: 1 },
        { id: 2 },
        { id: 3 },
        { id: 4 }
      ])
      emitter.batchEmitObjectsAndFlush([
        { id: 5 },
        { id: 6 },
        { id: 7 },
        { id: 8 }
      ])
      expect(chunks).to.eql([
        [1, 2, 3],
        [4, 5, 6, 7],
        [8]
      ])
    })

    it('should emit namespaced events in batches', function () {
      const chunks = []
      const emitter = new NamespacedBatchEmitter({ kind, socket, objectKeyPath })
      emitter.MIN_CHUNK_SIZE = 2
      emitter.MAX_CHUNK_SIZE = 3
      socket.on('namespacedEvents', ({ namespaces }) => {
        const chunk = {}
        for (const [namespace, events] of Object.entries(namespaces)) {
          chunk[namespace] = events.map(event => event.objectKey)
        }
        chunks.push(chunk)
      })
      emitter.batchEmitObjects([
        { id: 1 },
        { id: 2 },
        { id: 3 },
        { id: 4 }
      ], 'bar')
      emitter.batchEmitObjects([
        { id: 1 }
      ], 'foo')
      emitter.batchEmitObjects([
        { id: 5 },
        { id: 6 },
        { id: 7 },
        { id: 8 }
      ], 'bar')
      emitter.batchEmitObjectsAndFlush([
        { id: 2 }
      ], 'foo')
      expect(chunks).to.eql([
        { bar: [1, 2, 3] },
        { bar: [4], foo: [1] },
        { bar: [5, 6, 7] },
        { bar: [8], foo: [2] }
      ])
    })
  })
})
