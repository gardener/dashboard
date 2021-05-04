//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const assert = require('assert').strict
const EventEmitter = require('events')
const _ = require('lodash')
const logger = require('../lib/logger')
const config = require('../lib/config')
const watches = require('../lib/watches')
const cache = require('../lib/cache')
const { bootstrapper } = require('../lib/services/terminals')
const tickets = require('../lib/services/tickets')

describe('watches', function () {
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

  let informer

  beforeEach(function () {
    informer = new EventEmitter()
    jest.clearAllMocks()
  })

  describe('seeds', function () {
    const kind = 'Seed'

    it('should watch seeds', async function () {
      const bootstrapStub = jest.spyOn(bootstrapper, 'bootstrapResource')
      watches.seeds(io, informer)
      informer.emit('add', foo)
      informer.emit('add', bar)
      informer.emit('update', { kind, ...bar }, bar)
      informer.emit('delete', bar)
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

    let deleteTicketsStub
    let bootstrapResourceStub
    let removeResourceStub
    let findProjectByNamespaceStub

    beforeEach(function () {
      shootsWithIssues = new Set()
      deleteTicketsStub = jest.spyOn(tickets, 'deleteTickets')
      bootstrapResourceStub = jest.spyOn(bootstrapper, 'bootstrapResource').mockReturnValue()
      removeResourceStub = jest.spyOn(bootstrapper.bootstrapState, 'removeResource').mockReturnValue()
      findProjectByNamespaceStub = jest.spyOn(cache, 'findProjectByNamespace').mockImplementation(namespace => {
        return _.find(projectList, ['spec.namespace', namespace])
      })
    })

    it('should watch shoots without issues', async function () {
      watches.shoots(io, informer)

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

      informer.emit('add', foobar)
      informer.emit('update', foobar)
      informer.emit('delete', foobar)

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
      watches.shoots(io, informer, { shootsWithIssues })

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
      informer.emit('add', foobarUnhealthy)
      expect(shootsWithIssues).toHaveProperty('size', 1)
      informer.emit('update', foobar)
      expect(shootsWithIssues).toHaveProperty('size', 0)
      informer.emit('add', foobazUnhealthy)
      expect(shootsWithIssues).toHaveProperty('size', 1)
      informer.emit('update', foobazUnhealthy)
      expect(shootsWithIssues).toHaveProperty('size', 1)
      informer.emit('delete', foobazUnhealthy)
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

      watches.shoots(io, informer)

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

      informer.emit('delete', foobar)
      informer.emit('delete', foobaz)

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
      on (eventName, handler) {
        switch (eventName) {
          case 'issue':
            handler(issueEvent)
            break
          case 'comment':
            handler(commentEvent)
            break
        }
      }
    }

    const gitHubConfig = config.gitHub

    let gitHubStub
    let loadOpenIssuesStub

    beforeEach(function () {
      gitHubStub = jest.fn()
      Object.defineProperty(config, 'gitHub', { get: gitHubStub })
      loadOpenIssuesStub = jest.spyOn(tickets, 'loadOpenIssues').mockResolvedValue([])
      jest.clearAllMocks()
    })

    afterEach(function () {
      Object.defineProperty(config, 'gitHub', { value: gitHubConfig })
    })

    it('should log missing gitHub config', async function () {
      gitHubStub.mockReturnValue(false)
      watches.tickets(io, ticketCache)
      expect(logger.warn).toBeCalledTimes(1)
    })

    it('should watch tickets', async function () {
      gitHubStub.mockReturnValue(true)
      loadOpenIssuesStub.mockRejectedValueOnce(Object.assign(new Error('Service Unavailable'), {
        status: 503
      }))

      await watches.tickets(io, ticketCache, { minTimeout: 1 })
      expect(loadOpenIssuesStub).toBeCalledTimes(2)
      expect(logger.info).toBeCalledTimes(2)
    })

    it('should fail to fetch tickets', async function () {
      gitHubStub.mockReturnValue(true)
      loadOpenIssuesStub.mockRejectedValueOnce(new Error('Unexpected'))

      await watches.tickets(io, ticketCache)
      expect(loadOpenIssuesStub).toBeCalledTimes(1)
      expect(logger.error).toBeCalledTimes(1)
    })
  })
})
