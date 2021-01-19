//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const assert = require('assert').strict
const EventEmitter = require('events')
const _ = require('lodash')
const { dashboardClient } = require('@gardener-dashboard/kube-client')
const logger = require('../lib/logger')
const { registerHandler } = require('../lib/watches/common')
const config = require('../lib/config')
const watches = require('../lib/watches')
const cache = require('../lib/cache')
const { bootstrapper } = require('../lib/services/terminals')
const tickets = require('../lib/services/tickets')

describe('watches', function () {
  const resourceName = 'test'
  const io = {}
  const foo = { metadata: { name: 'foo', uid: 1 }, spec: { namespace: 'foo' } }
  const bar = { metadata: { name: 'bar', uid: 2 } }
  const foobar = { metadata: { namespace: 'foo', name: 'bar', uid: 4 } }
  const foobaz = { metadata: { namespace: 'foo', name: 'baz', uid: 5 } }
  const projectList = [
    {
      metadata: { name: 'foo' },
      spec: {
        namespace: 'foo'
      }
    },
    {
      metadata: { name: 'bar' },
      spec: {
        namespace: 'bar'
      }
    }
  ]

  let emitter

  beforeEach(function () {
    emitter = new EventEmitter()
    emitter.resourceName = resourceName
    jest.clearAllMocks()
  })

  describe('common', function () {
    it('should log "connect" events', async function () {
      registerHandler(emitter, () => {})
      emitter.emit('connect')
      expect(logger.debug).toHaveBeenCalledTimes(1)
      expect(logger.debug.mock.calls[0]).toEqual(['watch %s connected', resourceName])
    })

    it('should log "disconnect" events', async function () {
      registerHandler(emitter, () => {})
      const error = new Error('error')
      emitter.emit('disconnect', error)
      expect(logger.error).toHaveBeenCalledTimes(1)
      expect(logger.error.mock.calls[0]).toEqual(['watch %s disconnected', resourceName, error])
    })

    it('should log "reconnect" events', async function () {
      registerHandler(emitter, () => {})
      const attempt = 7
      const delay = 1234
      emitter.emit('reconnect', attempt, delay)
      expect(logger.debug).toHaveBeenCalledTimes(1)
      expect(logger.debug.mock.calls[0]).toEqual(['watch %s reconnect attempt %d after %d', resourceName, attempt, delay])
    })

    it('should log "error" events', async function () {
      registerHandler(emitter, () => {})
      const error = new Error('error')
      emitter.emit('error', error)
      expect(logger.error).toHaveBeenCalledTimes(1)
      expect(logger.error.mock.calls[0]).toEqual(['watch %s error occurred', resourceName, error])
    })

    it('should log "event" events with type "ERROR"', async function () {
      registerHandler(emitter, () => {})
      const code = 777
      const reason = 'Not found'
      const message = 'Something was not found'
      emitter.emit('event', { type: 'ERROR', object: { code, reason, message } })
      expect(logger.error).toHaveBeenCalledTimes(1)
      expect(logger.error.mock.calls[0]).toEqual(['ERROR: Code "%s", Reason "%s", message "%s, watch: %s"', code, reason, message, emitter.resourceName])
    })
  })

  describe('seeds', function () {
    const kind = 'Seed'
    const { seeds } = dashboardClient['core.gardener.cloud']

    it('should watch seeds', async function () {
      const watchStub = jest.spyOn(seeds, 'watchList').mockReturnValue(emitter)
      const bootstrapStub = jest.spyOn(bootstrapper, 'bootstrapResource')
      watches.seeds(io)
      expect(watchStub).toHaveBeenCalledTimes(1)
      emitter.emit('event', { type: 'ADDED', object: foo })
      emitter.emit('event', { type: 'ADDED', object: bar })
      emitter.emit('event', { type: 'MODIFIED', object: { kind, ...bar } })
      emitter.emit('event', { type: 'DELETED', object: bar })
      expect(bootstrapStub).toHaveBeenCalledTimes(3)
      expect(bootstrapStub.mock.calls[0]).toEqual([foo])
      expect(bootstrapStub.mock.calls[1]).toEqual([bar])
      expect(bootstrapStub.mock.calls[2]).toEqual([{ kind, ...bar }])
    })
  })

  describe('shoots', function () {
    class Room {
      constructor (namespace, events, kind = 'shoots') {
        this.kind = kind
        this.namespace = namespace
        this.events = events
      }

      emit (name, { kind, namespaces }) {
        assert.strictEqual(name, 'namespacedEvents')
        assert.strictEqual(kind, this.kind)
        assert.strictEqual(namespaces[this.namespace].length, 1)
        const { objectKey, ...actualEvent } = namespaces[this.namespace][0]
        assert.strictEqual(objectKey, actualEvent.object.metadata.uid)
        assert.notStrictEqual(this.events.length, 0)
        const expectedEvent = this.events[0]
        assert.deepStrictEqual(actualEvent, expectedEvent)
        this.events.shift()
      }
    }

    const foobarUnhealthy = _
      .chain(foobar)
      .cloneDeep()
      .set('metadata.labels["shoot.gardener.cloud/status"]', 'unhealthy')
      .value()

    const foobazUnhealthy = _
      .chain(foobaz)
      .cloneDeep()
      .set('metadata.labels["shoot.gardener.cloud/status"]', 'unhealthy')
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
            assert.fail(`Unexpect room ${room}`)
        }
      }
    }

    const io = {
      of (namespace) {
        assert.strictEqual(namespace, '/shoots')
        return nsp
      }
    }

    const { shoots } = dashboardClient['core.gardener.cloud']

    let watchStub
    let deleteTicketsStub
    let bootstrapResourceStub
    let removeResourceStub
    let findProjectByNamespaceStub

    beforeEach(function () {
      shootsWithIssues = new Set()
      watchStub = jest.spyOn(shoots, 'watchListAllNamespaces').mockReturnValue(emitter)
      deleteTicketsStub = jest.spyOn(tickets, 'deleteTickets')
      bootstrapResourceStub = jest.spyOn(bootstrapper, 'bootstrapResource').mockReturnValue()
      removeResourceStub = jest.spyOn(bootstrapper.bootstrapState, 'removeResource').mockReturnValue()
      findProjectByNamespaceStub = jest.spyOn(cache, 'findProjectByNamespace').mockImplementation(namespace => {
        return _.find(projectList, ['spec.namespace', namespace])
      })
    })

    it('should watch shoots without issues', async function () {
      watches.shoots(io)

      expect(watchStub).toBeCalledTimes(1)

      fooRoom = new Room('foo', [
        { type: 'ADDED', object: foobar },
        { type: 'MODIFIED', object: foobar },
        { type: 'DELETED', object: foobar }
      ])

      fooBarRoom = new Room('foo', [
        { type: 'ADDED', object: foobar },
        { type: 'MODIFIED', object: foobar },
        { type: 'DELETED', object: foobar }
      ], 'shoot')

      fooBazRoom = new Room('foo', [], 'shoot')

      fooIssuesRoom = new Room('foo', [])

      emitter.emit('event', { type: 'ADDED', object: foobar })
      emitter.emit('event', { type: 'MODIFIED', object: foobar })
      emitter.emit('event', { type: 'DELETED', object: foobar })

      expect(logger.error).not.toBeCalled()
      expect(bootstrapResourceStub).toBeCalledTimes(2)
      expect(removeResourceStub).toBeCalledTimes(1)
      expect(removeResourceStub.mock.calls).toEqual([[foobar]])
      expect(deleteTicketsStub).toBeCalledTimes(1)
      expect(findProjectByNamespaceStub).toBeCalledTimes(1)
      expect(findProjectByNamespaceStub.mock.calls).toEqual([['foo']])

      expect(fooRoom.events).toHaveLength(0)
      expect(fooBarRoom.events).toHaveLength(0)
      expect(fooBazRoom.events).toHaveLength(0)
      expect(fooIssuesRoom.events).toHaveLength(0)
    })

    it('should watch shoots with issues', async function () {
      watches.shoots(io, { shootsWithIssues })

      expect(watchStub).toBeCalledTimes(1)

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
      ], 'shoot')

      fooBazRoom = new Room('foo', [
        { type: 'ADDED', object: foobazUnhealthy },
        { type: 'MODIFIED', object: foobazUnhealthy },
        { type: 'DELETED', object: foobazUnhealthy }
      ], 'shoot')

      fooIssuesRoom = new Room('foo', [
        { type: 'ADDED', object: foobarUnhealthy },
        { type: 'DELETED', object: foobar },
        { type: 'ADDED', object: foobazUnhealthy },
        { type: 'MODIFIED', object: foobazUnhealthy },
        { type: 'DELETED', object: foobazUnhealthy }
      ])

      expect(shootsWithIssues).toHaveProperty('size', 0)
      emitter.emit('event', { type: 'ADDED', object: foobarUnhealthy })
      expect(shootsWithIssues).toHaveProperty('size', 1)
      emitter.emit('event', { type: 'MODIFIED', object: foobar })
      expect(shootsWithIssues).toHaveProperty('size', 0)
      emitter.emit('event', { type: 'ADDED', object: foobazUnhealthy })
      expect(shootsWithIssues).toHaveProperty('size', 1)
      emitter.emit('event', { type: 'MODIFIED', object: foobazUnhealthy })
      expect(shootsWithIssues).toHaveProperty('size', 1)
      emitter.emit('event', { type: 'DELETED', object: foobazUnhealthy })
      expect(shootsWithIssues).toHaveProperty('size', 0)

      expect(bootstrapResourceStub).toBeCalledTimes(4)
      expect(removeResourceStub).toBeCalledTimes(1)
      expect(removeResourceStub.mock.calls).toEqual([[foobazUnhealthy]])
      expect(deleteTicketsStub).toBeCalledTimes(1)

      expect(fooRoom.events).toHaveLength(0)
      expect(fooBarRoom.events).toHaveLength(0)
      expect(fooBazRoom.events).toHaveLength(0)
      expect(fooIssuesRoom.events).toHaveLength(0)
    })

    it('should delete tickets for a deleted shoot', async function () {
      deleteTicketsStub.mockImplementation(({ projectName, name }) => {
        const namespace = _.find(projectList, ['metadata.name', projectName]).spec.namespace
        if (namespace === 'foo' && name === 'baz') {
          throw new Error('TicketError')
        }
      })

      watches.shoots(io)

      expect(watchStub).toBeCalledTimes(1)

      fooRoom = new Room('foo', [
        { type: 'DELETED', object: foobar },
        { type: 'DELETED', object: foobaz }
      ])

      fooBarRoom = new Room('foo', [
        { type: 'DELETED', object: foobar }
      ], 'shoot')

      fooBazRoom = new Room('foo', [
        { type: 'DELETED', object: foobaz }
      ], 'shoot')

      fooIssuesRoom = new Room('foo', [])

      emitter.emit('event', { type: 'DELETED', object: foobar })
      emitter.emit('event', { type: 'DELETED', object: foobaz })

      expect(logger.error).toBeCalledTimes(1)
      expect(removeResourceStub).toBeCalledTimes(2)
      expect(removeResourceStub.mock.calls).toEqual([[foobar], [foobaz]])
      expect(deleteTicketsStub).toBeCalledTimes(2)

      expect(fooRoom.events).toHaveLength(0)
      expect(fooBarRoom.events).toHaveLength(0)
      expect(fooBazRoom.events).toHaveLength(0)
      expect(fooIssuesRoom.events).toHaveLength(0)
    })
  })

  describe('tickets', function () {
    const issueEvent = {}
    const issuesRoom = {
      emit (name, payload) {
        assert.strictEqual(name, 'events')
        assert.deepStrictEqual(payload, {
          kind: 'issues',
          events: [issueEvent]
        })
      }
    }

    const commentEvent = {
      object: {
        metadata: {
          projectName: 'foo',
          name: 'bar'
        }
      }
    }
    const commentsRoom = {
      emit (name, payload) {
        assert.strictEqual(name, 'events')
        assert.deepStrictEqual(payload, {
          kind: 'comments',
          events: [commentEvent]
        })
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
        assert.strictEqual(namespace, '/tickets')
        return nsp
      }
    }

    const ticketCache = {
      onIssue (handler) {
        handler(issueEvent)
      },
      onComment (handler) {
        handler(commentEvent)
      }
    }

    const gitHubConfig = config.gitHub

    let getTicketCacheStub
    let gitHubStub
    let loadOpenIssuesStub

    beforeEach(function () {
      gitHubStub = jest.fn()
      Object.defineProperty(config, 'gitHub', { get: gitHubStub })
      getTicketCacheStub = jest.spyOn(cache, 'getTicketCache').mockReturnValue(ticketCache)
      loadOpenIssuesStub = jest.spyOn(tickets, 'loadOpenIssues').mockResolvedValue([])
      jest.clearAllMocks()
    })

    afterEach(function () {
      Object.defineProperty(config, 'gitHub', { value: gitHubConfig })
    })

    it('should log missing gitHub config', async function () {
      gitHubStub.mockReturnValue(false)
      watches.tickets(io)
      expect(logger.warn).toBeCalledTimes(1)
    })

    it('should watch tickets', async function () {
      gitHubStub.mockReturnValue(true)
      loadOpenIssuesStub.mockRejectedValueOnce(Object.assign(new Error('Service Unavailable'), {
        status: 503
      }))

      const promise = watches.tickets(io, { minTimeout: 1 })
      expect(getTicketCacheStub).toBeCalledTimes(1)
      await promise
      expect(loadOpenIssuesStub).toBeCalledTimes(2)
      expect(logger.info).toBeCalledTimes(2)
    })

    it('should fail to fetch tickets', async function () {
      gitHubStub.mockReturnValue(true)
      loadOpenIssuesStub.mockRejectedValueOnce(new Error('Unexpected'))

      const promise = watches.tickets(io)
      expect(getTicketCacheStub).toBeCalledTimes(1)
      expect(loadOpenIssuesStub).toBeCalledTimes(1)
      await promise
      expect(logger.error).toBeCalledTimes(1)
    })
  })
})
