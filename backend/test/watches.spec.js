//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const fixtures = require('../__fixtures__')

jest.mock('../lib/github/SyncManager')

const EventEmitter = require('events')
const pLimit = require('p-limit')
const _ = require('lodash')
const logger = require('../lib/logger')
const config = require('../lib/config')
const watches = require('../lib/watches')
const cache = require('../lib/cache')
const tickets = require('../lib/services/tickets')
const SyncManager = require('../lib/github/SyncManager')

const rooms = new Map()

function getRoom (name) {
  if (!rooms.has(name)) {
    rooms.set(name, {
      emit: jest.fn()
    })
  }
  return rooms.get(name)
}

const nsp = {
  to: jest.fn().mockImplementation(name => {
    if (Array.isArray(name)) {
      return {
        rooms: name.map(getRoom),
        emit (...args) {
          for (const room of this.rooms) {
            room.emit(...args)
          }
        }
      }
    }
    return getRoom(name)
  }),
  emit: jest.fn()
}

const io = {
  of: jest.fn().mockReturnValue(nsp)
}

describe('watches', function () {
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
    rooms.clear()
    jest.clearAllMocks()
  })

  describe('shoots', function () {
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

    let deleteTicketsStub
    let findProjectByNamespaceStub

    beforeEach(() => {
      shootsWithIssues = new Set()
      deleteTicketsStub = jest.spyOn(tickets, 'deleteTickets')
      findProjectByNamespaceStub = jest.spyOn(cache, 'findProjectByNamespace').mockImplementation(namespace => {
        return _.find(projectList, ['spec.namespace', namespace])
      })
    })

    it('should watch shoots without issues', async function () {
      watches.shoots(io, informer)

      expect(io.of).toBeCalledTimes(1)
      expect(io.of.mock.calls).toEqual([['/']])

      informer.emit('add', foobar)
      informer.emit('update', foobar)
      informer.emit('delete', foobar)

      expect(logger.error).not.toBeCalled()
      expect(deleteTicketsStub).toBeCalledTimes(1)
      expect(findProjectByNamespaceStub).toBeCalledTimes(1)
      expect(findProjectByNamespaceStub.mock.calls).toEqual([['foo']])

      const keys = ['shoots:admin', 'shoots;foo', 'shoots;foo/bar']
      expect(nsp.to).toBeCalledTimes(3)
      expect(nsp.to.mock.calls).toEqual([[keys], [keys], [keys]])
      expect(Array.from(rooms.keys())).toEqual(keys)
      for (const key of keys) {
        const room = rooms.get(key)
        expect(room.emit).toBeCalledTimes(3)
        expect(room.emit.mock.calls).toEqual([
          [
            'shoots',
            { type: 'ADDED', object: foobar }
          ],
          [
            'shoots',
            { type: 'MODIFIED', object: foobar }
          ],
          [
            'shoots',
            { type: 'DELETED', object: foobar }
          ]
        ])
      }
    })

    it('should watch shoots with issues', async function () {
      watches.shoots(io, informer, { shootsWithIssues })

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

      expect(deleteTicketsStub).toBeCalledTimes(1)

      const fooRoom = rooms.get('shoots;foo')
      expect(fooRoom.emit).toBeCalledTimes(5)
      const fooIssuesRoom = rooms.get('shoots:unhealthy;foo')
      expect(fooIssuesRoom.emit).toBeCalledTimes(5)
      expect(fooIssuesRoom.emit.mock.calls).toEqual([
        [
          'shoots',
          { type: 'ADDED', object: foobarUnhealthy }
        ],
        [
          'shoots',
          { type: 'DELETED', object: foobar }
        ],
        [
          'shoots',
          { type: 'ADDED', object: foobazUnhealthy }
        ],
        [
          'shoots',
          { type: 'MODIFIED', object: foobazUnhealthy }
        ],
        [
          'shoots',
          { type: 'DELETED', object: foobazUnhealthy }
        ]
      ])
    })

    it('should delete tickets for a deleted shoot', async function () {
      deleteTicketsStub.mockImplementation(({ projectName, name }) => {
        const namespace = _.find(projectList, ['metadata.name', projectName]).spec.namespace
        if (namespace === 'foo' && name === 'baz') {
          throw new Error('TicketError')
        }
      })

      watches.shoots(io, informer)

      informer.emit('delete', foobar)
      informer.emit('delete', foobaz)

      expect(logger.error).toBeCalledTimes(1)
      expect(deleteTicketsStub).toBeCalledTimes(2)
    })
  })

  describe('leases', function () {
    const metadata = {
      projectName: 'foo',
      name: 'bar'
    }
    const issueEvent = { object: { metadata } }
    const commentEvent = { object: { metadata } }

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

    const gitHubConfig = {
      pollIntervalSeconds: 10,
      syncThrottleSeconds: 2
    }

    let gitHubStub
    let abortController
    let signal

    beforeEach(function () {
      jest.clearAllMocks()

      gitHubStub = jest.fn()
      Object.defineProperty(config, 'gitHub', { get: gitHubStub })
      gitHubStub.mockReturnValue(gitHubConfig)

      abortController = new AbortController()
      signal = abortController.signal

      jest.spyOn(cache, 'getTicketCache').mockReturnValue(ticketCache)
    })

    it('should log a warning if gitHub config is missing and not continue', async function () {
      jest.spyOn(ticketCache, 'on')
      gitHubStub.mockReturnValue(false)

      await watches.leases(io, informer, { signal: abortController.signal })

      expect(logger.warn).toBeCalledTimes(1)
      expect(ticketCache.on).toBeCalledTimes(0)
    })

    it('should add event listeners and create SyncManager', async function () {
      jest.spyOn(ticketCache, 'on')
      jest.spyOn(informer, 'on')

      watches.leases(io, informer, { signal })

      expect(io.of).toBeCalledTimes(1)
      expect(io.of).toBeCalledWith('/')

      expect(ticketCache.on).toBeCalledTimes(2)
      expect(ticketCache.on).toBeCalledWith('issue', expect.any(Function))
      expect(ticketCache.on).toBeCalledWith('comment', expect.any(Function))

      expect(SyncManager).toBeCalledTimes(1)
      expect(SyncManager).toBeCalledWith(expect.any(Function), {
        interval: gitHubConfig.pollIntervalSeconds * 1000,
        throttle: gitHubConfig.syncThrottleSeconds * 1000,
        signal
      })
      const syncManagerInstance = SyncManager.mock.instances[0]
      expect(syncManagerInstance.sync).toBeCalledTimes(1)

      expect(informer.on).toBeCalledTimes(1)
      expect(informer.on).toBeCalledWith('update', expect.any(Function))
    })

    it('should create SyncManager with defaults', async () => {
      gitHubStub.mockReturnValue({})

      watches.leases(io, informer, { signal })

      expect(SyncManager).toBeCalledTimes(1)
      expect(SyncManager.mock.calls[0]).toEqual([
        expect.any(Function),
        {
          interval: 0,
          throttle: 0,
          signal
        }
      ])
    })

    it('should call loadOpenIssuesAndComments with defaulted concurrency parameter', async () => {
      jest.spyOn(tickets, 'loadOpenIssues')
      tickets.loadOpenIssues.mockReturnValue([])

      gitHubStub.mockReturnValue({})
      watches.leases(io, informer, { signal })

      expect(SyncManager).toBeCalledTimes(1)
      const [funcWithDefaultConcurrency] = SyncManager.mock.calls[0]
      await funcWithDefaultConcurrency()
      expect(pLimit).toBeCalledWith(10)
    })

    it('should call loadOpenIssuesAndComments with configured concurrency parameter', async () => {
      jest.spyOn(tickets, 'loadOpenIssues')
      tickets.loadOpenIssues.mockReturnValue([])

      gitHubStub.mockReturnValue({ syncConcurrency: 42 })
      watches.leases(io, informer, { signal })

      expect(SyncManager).toBeCalledTimes(1)
      const [funcWithConfiguredConcurrency] = SyncManager.mock.calls[0]
      await funcWithConfiguredConcurrency()
      expect(pLimit).toBeCalledWith(42)
    })

    it('should emit ticket cache events to socket io', async () => {
      watches.leases(io, informer, { signal })

      expect(nsp.emit).toBeCalledTimes(1)
      expect(nsp.emit).toBeCalledWith('issues', issueEvent)

      const room = `shoots;${cache.getProjectNamespace(issueEvent.object.metadata.projectName)}/${issueEvent.object.metadata.name}`
      const mockRoom = rooms.get(room)
      expect(nsp.to).toBeCalledWith([room])
      expect(mockRoom.emit).toBeCalledTimes(1)
      expect(mockRoom.emit).toBeCalledWith('comments', issueEvent)
    })

    it('should listen to informer update events', async function () {
      jest.spyOn(informer, 'on')

      watches.leases(io, informer, { signal })

      expect(informer.on).toBeCalledTimes(1)
      expect(informer.on).toBeCalledWith('update', expect.any(Function))

      informer.emit('update', {})

      const syncManagerInstance = SyncManager.mock.instances[0]
      expect(syncManagerInstance.sync).toBeCalledTimes(2)
    })

    it('should should load issues and comments of all issues', async function () {
      const { loadOpenIssuesAndComments } = watches.leases.test

      const issues = fixtures.github.issues.list()
      const issueNumbers = issues.map(i => i.number)
      const comments = fixtures.github.comments.list()
      const t = issues.map(i => tickets.fromIssue(i))

      jest.spyOn(tickets, 'loadOpenIssues')
      jest.spyOn(tickets, 'loadIssueComments')
      tickets.loadOpenIssues.mockReturnValue(t)
      const loadIssueCommentsMock = ({ number }) => comments.filter((comment) => comment.number === number)
      tickets.loadIssueComments.mockImplementation(loadIssueCommentsMock)

      await loadOpenIssuesAndComments(10)

      expect(tickets.loadOpenIssues).toBeCalledTimes(1)
      expect(tickets.loadIssueComments).toBeCalledTimes(t.length)
      for (const number of issueNumbers) {
        expect(tickets.loadIssueComments).toBeCalledWith({ number })
      }
    })
  })
})
