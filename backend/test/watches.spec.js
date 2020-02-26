//
// Copyright (c) 2019 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file
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

const EventEmitter = require('events')
const _ = require('lodash')
const { dashboardClient } = require('../lib/kubernetes-client')
const logger = require('../lib/logger')
const { registerHandler } = require('../lib/watches/common')
const config = require('../lib/config')
const watches = require('../lib/watches')
const { cache } = require('../lib/cache')
const { bootstrapper } = require('../lib/services/terminals')
const journals = require('../lib/services/journals')

describe('watches', function () {
  /* eslint no-unused-expressions: 0 */
  const sandbox = sinon.createSandbox()
  const resourceName = 'test'
  const io = {}
  const foo = { metadata: { name: 'foo', uid: 1 }, spec: { namespace: 'foo' } }
  const bar = { metadata: { name: 'bar', uid: 2 } }
  const foobar = { metadata: { namespace: 'foo', name: 'bar', uid: 4 } }
  const foobaz = { metadata: { namespace: 'foo', name: 'baz', uid: 5 } }

  let emitter

  beforeEach(function () {
    emitter = new EventEmitter()
    emitter.resourceName = resourceName
  })

  afterEach(function () {
    sandbox.restore()
  })

  describe('common', function () {
    it('should log "connect" events', async function () {
      const spy = sandbox.spy(logger, 'debug')
      registerHandler(emitter, () => {})
      emitter.emit('connect')
      expect(spy).to.be.calledOnceWith('watch %s connected', resourceName)
    })

    it('should log "disconnect" events', async function () {
      const spy = sandbox.spy(logger, 'error')
      registerHandler(emitter, () => {})
      const error = new Error('error')
      emitter.emit('disconnect', error)
      expect(spy).to.be.calledOnceWith('watch %s disconnected', resourceName, error)
    })

    it('should log "reconnect" events', async function () {
      const spy = sandbox.spy(logger, 'debug')
      registerHandler(emitter, () => {})
      const attempt = 7
      const delay = 1234
      emitter.emit('reconnect', attempt, delay)
      expect(spy).to.be.calledOnceWith('watch %s reconnect attempt %d after %d', resourceName, attempt, delay)
    })

    it('should log "error" events', async function () {
      const spy = sandbox.spy(logger, 'error')
      registerHandler(emitter, () => {})
      const error = new Error('error')
      emitter.emit('error', error)
      expect(spy).to.be.calledOnceWith('watch %s error occurred', resourceName, error)
    })

    it('should log "event" events with type "ERROR"', async function () {
      const spy = sandbox.spy(logger, 'error')
      registerHandler(emitter, () => {})
      const code = 777
      const reason = 'Not found'
      const message = 'Something was not found'
      emitter.emit('event', { type: 'ERROR', object: { code, reason, message } })
      expect(spy).to.be.calledOnceWith('ERROR: Code "%s", Reason "%s", message "%s, watch: %s"', code, reason, message, emitter.resourceName)
    })
  })

  describe('seeds', function () {
    const kind = 'Seeds'
    const { seeds } = dashboardClient['core.gardener.cloud']

    it('should watch seeds', async function () {
      const watchStub = sandbox.stub(seeds, 'watchList').returns(emitter)
      const bootstrapStub = sandbox.stub(bootstrapper, 'bootstrapResource')
      watches.seeds(io)
      expect(watchStub).to.be.calledOnce
      emitter.emit('event', { type: 'ADDED', object: foo })
      emitter.emit('event', { type: 'ADDED', object: bar })
      emitter.emit('event', { type: 'MODIFIED', object: { kind, ...bar } })
      emitter.emit('event', { type: 'DELETED', object: bar })
      expect(bootstrapStub).to.be.calledTwice
      expect(bootstrapStub.firstCall).to.be.calledWith(foo)
      expect(bootstrapStub.secondCall).to.be.calledWith(bar)
    })
  })

  describe('shoots', function () {
    class Room {
      constructor (namespace, events) {
        this.namespace = namespace
        this.events = events
      }

      emit (event, { kind, namespaces }) {
        expect(event).to.equal('namespacedEvents')
        expect(kind).to.equal('shoots')
        expect(namespaces[this.namespace]).to.have.length(1)
        const { objectKey, ...actualEvent } = namespaces[this.namespace][0]
        expect(objectKey).to.equal(actualEvent.object.metadata.uid)
        expect(this.events).to.be.not.empty
        const expectedEvent = this.events[0]
        expect(actualEvent).to.eql(expectedEvent)
        this.events.shift()
      }
    }

    function qualifiedName ({ metadata: { namespace, name } }) {
      return { namespace, name }
    }

    const foobarUnhealthy = _
      .chain(foobar)
      .cloneDeep()
      .set('metadata.labels["shoot.garden.sapcloud.io/status"]', 'unhealthy')
      .value()

    const foobazUnhealthy = _
      .chain(foobaz)
      .cloneDeep()
      .set('metadata.labels["shoot.garden.sapcloud.io/status"]', 'unhealthy')
      .value()

    let shootsWithIssues
    let fooRoom
    let fooBazRoom
    let fooBarRoom
    let fooIssuesRoom

    const nsp = {
      to (room) {
        switch (room) {
          case 'shoots_foo':
            return fooRoom
          case 'shoot_foo_bar':
            return fooBarRoom
          case 'shoot_foo_baz':
            return fooBazRoom
          case 'shoots_foo_issues':
            return fooIssuesRoom
          default:
            expect.fail(`Unexpect room ${room}`)
        }
      }
    }

    const io = {
      of (namespace) {
        expect(namespace).to.equal('/shoots')
        return nsp
      }
    }

    const { shoots } = dashboardClient['core.gardener.cloud']

    let watchStub
    let errorSpy
    let deleteJournalsStub
    let bootstrapResourceStub
    let isResourcePendingStub
    let removePendingResourceStub

    beforeEach(function () {
      shootsWithIssues = new Set()
      watchStub = sandbox.stub(shoots, 'watchListAllNamespaces').returns(emitter)
      errorSpy = sandbox.spy(logger, 'error')
      deleteJournalsStub = sandbox.stub(journals, 'deleteJournals')
      bootstrapResourceStub = sandbox.stub(bootstrapper, 'bootstrapResource')
      isResourcePendingStub = sandbox.stub(bootstrapper, 'isResourcePending')
      removePendingResourceStub = sandbox.stub(bootstrapper, 'removePendingResource')
    })

    it('should watch shoots without issues', async function () {
      isResourcePendingStub.withArgs(foobar).returns(true)

      watches.shoots(io)

      expect(watchStub).to.be.calledOnce

      fooRoom = new Room('foo', [
        { type: 'ADDED', object: foobar },
        { type: 'MODIFIED', object: foobar },
        { type: 'DELETED', object: foobar }
      ])

      fooBarRoom = new Room('foo', [
        { type: 'ADDED', object: foobar },
        { type: 'MODIFIED', object: foobar },
        { type: 'DELETED', object: foobar }
      ])

      fooBazRoom = new Room('foo', [])

      fooIssuesRoom = new Room('foo', [])

      emitter.emit('event', { type: 'ADDED', object: foobar })
      emitter.emit('event', { type: 'MODIFIED', object: foobar })
      emitter.emit('event', { type: 'DELETED', object: foobar })

      expect(errorSpy).to.not.be.called
      expect(bootstrapResourceStub).to.be.calledTwice
      expect(isResourcePendingStub).to.be.calledTwice
      expect(removePendingResourceStub).to.be.calledOnce
      expect(deleteJournalsStub).to.be.calledOnce

      expect(fooRoom.events).to.be.empty
      expect(fooBarRoom.events).to.be.empty
      expect(fooBazRoom.events).to.be.empty
      expect(fooIssuesRoom.events).to.be.empty
    })

    it('should watch shoots with issues', async function () {
      isResourcePendingStub.withArgs(foobar).returns(false)
      isResourcePendingStub.withArgs(foobazUnhealthy).returns(true)
      removePendingResourceStub.withArgs(foobazUnhealthy)

      watches.shoots(io, { shootsWithIssues })

      expect(watchStub).to.be.calledOnce

      fooRoom = new Room('foo', [
        { type: 'ADDED', object: foobarUnhealthy },
        { type: 'MODIFIED', object: foobar },
        { type: 'ADDED', object: foobazUnhealthy },
        { type: 'MODIFIED', object: foobazUnhealthy },
        { type: 'DELETED', object: foobazUnhealthy }
      ])

      fooBarRoom = new Room('foo', [
        { type: 'ADDED', object: foobarUnhealthy },
        { type: 'MODIFIED', object: foobar }
      ])

      fooBazRoom = new Room('foo', [
        { type: 'ADDED', object: foobazUnhealthy },
        { type: 'MODIFIED', object: foobazUnhealthy },
        { type: 'DELETED', object: foobazUnhealthy }
      ])

      fooIssuesRoom = new Room('foo', [
        { type: 'ADDED', object: foobarUnhealthy },
        { type: 'DELETED', object: foobar },
        { type: 'ADDED', object: foobazUnhealthy },
        { type: 'MODIFIED', object: foobazUnhealthy },
        { type: 'DELETED', object: foobazUnhealthy }
      ])

      expect(shootsWithIssues).to.have.length(0)
      emitter.emit('event', { type: 'ADDED', object: foobarUnhealthy })
      expect(shootsWithIssues).to.have.length(1)
      emitter.emit('event', { type: 'MODIFIED', object: foobar })
      expect(shootsWithIssues).to.have.length(0)
      emitter.emit('event', { type: 'ADDED', object: foobazUnhealthy })
      expect(shootsWithIssues).to.have.length(1)
      emitter.emit('event', { type: 'MODIFIED', object: foobazUnhealthy })
      expect(shootsWithIssues).to.have.length(1)
      emitter.emit('event', { type: 'DELETED', object: foobazUnhealthy })
      expect(shootsWithIssues).to.have.length(0)

      expect(bootstrapResourceStub).to.be.calledThrice
      expect(isResourcePendingStub).to.be.calledThrice
      expect(removePendingResourceStub).to.be.calledOnce
      expect(deleteJournalsStub).to.be.calledOnce

      expect(fooRoom.events).to.be.empty
      expect(fooBarRoom.events).to.be.empty
      expect(fooBazRoom.events).to.be.empty
      expect(fooIssuesRoom.events).to.be.empty
    })

    it('should delete journals for a deleted shoot', async function () {
      deleteJournalsStub.withArgs(qualifiedName(foobaz)).throws(new Error('JournalError'))
      isResourcePendingStub.withArgs(foobar).returns(true)
      isResourcePendingStub.withArgs(foobaz).returns(false)
      removePendingResourceStub.withArgs(foobar)

      watches.shoots(io)

      expect(watchStub).to.be.calledOnce

      fooRoom = new Room('foo', [
        { type: 'DELETED', object: foobar },
        { type: 'DELETED', object: foobaz }
      ])

      fooBarRoom = new Room('foo', [
        { type: 'DELETED', object: foobar }
      ])

      fooBazRoom = new Room('foo', [
        { type: 'DELETED', object: foobaz }
      ])

      fooIssuesRoom = new Room('foo', [])

      emitter.emit('event', { type: 'DELETED', object: foobar })
      emitter.emit('event', { type: 'DELETED', object: foobaz })

      expect(errorSpy).to.be.calledOnce
      expect(isResourcePendingStub).to.be.calledTwice
      expect(removePendingResourceStub).to.be.calledOnce
      expect(deleteJournalsStub).to.be.calledTwice

      expect(fooRoom.events).to.be.empty
      expect(fooBarRoom.events).to.be.empty
      expect(fooBazRoom.events).to.be.empty
      expect(fooIssuesRoom.events).to.be.empty
    })
  })

  describe('journals', function () {
    const serviceUnavailable = new Error('Service Unavailable')
    serviceUnavailable.status = 503

    const issueEvent = {}
    const issuesRoom = {
      emit (...args) {
        expect(args).to.eql(['events', {
          kind: 'issues',
          events: [issueEvent]
        }])
      }
    }

    const commentEvent = {
      object: {
        metadata: {
          namespace: 'foo',
          name: 'bar'
        }
      }
    }
    const commentsRoom = {
      emit (...args) {
        expect(args).to.eql(['events', {
          kind: 'comments',
          events: [commentEvent]
        }])
      }
    }

    const nsp = {
      to (room) {
        switch (room) {
          case 'issues':
            return issuesRoom
          case 'comments_foo/bar':
            return commentsRoom
        }
      }
    }

    const io = {
      of (namespace) {
        expect(namespace).to.equal('/journals')
        return nsp
      }
    }

    const journalCache = {
      onIssue (handler) {
        handler(issueEvent)
      },
      onComment (handler) {
        handler(commentEvent)
      }
    }
    let gitHubConfigStub
    let warnSpy
    let infoSpy
    let errorSpy
    let cacheStub
    let loadOpenIssuesStub

    beforeEach(function () {
      gitHubConfigStub = sandbox.stub(config, 'gitHub')
      infoSpy = sandbox.spy(logger, 'info')
      warnSpy = sandbox.spy(logger, 'warn')
      errorSpy = sandbox.spy(logger, 'error')
      cacheStub = sandbox.stub(cache, 'getJournalCache')
      loadOpenIssuesStub = sandbox.stub(journals, 'loadOpenIssues')
    })

    it('should log missing gitHub config', async function () {
      gitHubConfigStub.get(() => false)
      watches.journals(io)
      expect(warnSpy).to.be.calledOnce
    })

    it('should watch journals', async function () {
      gitHubConfigStub.get(() => true)
      cacheStub.returns(journalCache)
      loadOpenIssuesStub.onCall(0).throws(serviceUnavailable)
      const promise = watches.journals(io, { minTimeout: 1 })
      expect(cacheStub).to.be.calledOnce
      await promise
      expect(loadOpenIssuesStub).to.be.calledTwice
      expect(infoSpy).to.be.calledTwice
    })

    it('should fail to fetch journals', async function () {
      gitHubConfigStub.get(() => true)
      cacheStub.returns(journalCache)
      loadOpenIssuesStub.throws(new Error('Unexpected'))

      const promise = watches.journals(io)
      expect(cacheStub).to.be.calledOnce
      expect(loadOpenIssuesStub).to.be.calledOnce
      await promise
      expect(errorSpy).to.be.calledOnce
    })
  })
})
