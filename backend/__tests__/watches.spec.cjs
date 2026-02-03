//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const fixtures = require('../__fixtures__')

jest.mock('../dist/lib/github/SyncManager')

const EventEmitter = require('events')
const pLimit = require('p-limit')
const _ = require('lodash')
const logger = require('../dist/lib/logger')
const config = require('../dist/lib/config')
const watches = require('../dist/lib/watches')
const cache = require('../dist/lib/cache')
const tickets = require('../dist/lib/services/tickets')
const SyncManager = require('../dist/lib/github/SyncManager')
const { sha256 } = require('../dist/lib/io/helper')

const { cloneDeep } = require('lodash')

const flushPromises = () => new Promise(setImmediate)

const rooms = new Map()

function getRoom (name) {
  if (!rooms.has(name)) {
    rooms.set(name, {
      emit: jest.fn(),
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
        },
      }
    }
    return getRoom(name)
  }),
  emit: jest.fn(),
}

const sockets = [
  {
    id: 1,
    data: {
      user: {
        id: 'admin@example.org',
        profiles: {
          canListProjects: true,
          canListSeeds: true,
        },
      },
    },
  },
  {
    id: 2,
    data: {
      user: {
        id: 'foo@example.org',
        profiles: {
          canListProjects: false,
          canListSeeds: false,
        },
      },
    },
  },
  {
    id: 3,
    data: {
      user: {
        id: 'bar@example.org',
        profiles: {
          canListProjects: false,
          canListSeeds: true,
        },
      },
    },
  },
]

const io = {
  of: jest.fn().mockReturnValue(nsp),
  fetchSockets: jest.fn().mockResolvedValue(sockets),
}

describe('watches', function () {
  const foobar = { metadata: { namespace: 'foo', name: 'bar', uid: 4 } }
  const foobaz = { metadata: { namespace: 'foo', name: 'baz', uid: 5 } }

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
      .set(['metadata', 'labels', 'shoot.gardener.cloud/status'], 'unhealthy')
      .value()

    const foobazUnhealthy = _
      .chain(foobaz)
      .cloneDeep()
      .set(['metadata', 'labels', 'shoot.gardener.cloud/status'], 'unhealthy')
      .value()

    let shootsWithIssues

    beforeEach(() => {
      shootsWithIssues = new Set()
    })

    it('should watch shoots without issues', async function () {
      watches.shoots(io, informer)

      expect(io.of).toHaveBeenCalledTimes(1)
      expect(io.of.mock.calls).toEqual([['/']])

      informer.emit('add', foobar)
      informer.emit('update', foobar)
      informer.emit('delete', foobar)

      expect(logger.error).not.toHaveBeenCalled()

      const keys = ['shoots:admin', 'shoots;foo', 'shoots;foo/bar']
      expect(nsp.to).toHaveBeenCalledTimes(3)
      expect(nsp.to.mock.calls).toEqual([[keys], [keys], [keys]])
      expect(Array.from(rooms.keys())).toEqual(keys)
      for (const key of keys) {
        const room = rooms.get(key)
        expect(room.emit).toHaveBeenCalledTimes(3)
        expect(room.emit.mock.calls).toEqual([
          [
            'shoots',
            { type: 'ADDED', uid: foobar.metadata.uid },
          ],
          [
            'shoots',
            { type: 'MODIFIED', uid: foobar.metadata.uid },
          ],
          [
            'shoots',
            { type: 'DELETED', uid: foobar.metadata.uid },
          ],
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

      const fooRoom = rooms.get('shoots;foo')
      expect(fooRoom.emit).toHaveBeenCalledTimes(5)
      const fooIssuesRoom = rooms.get('shoots:unhealthy;foo')
      expect(fooIssuesRoom.emit).toHaveBeenCalledTimes(5)
      expect(fooIssuesRoom.emit.mock.calls).toEqual([
        [
          'shoots',
          { type: 'ADDED', uid: foobarUnhealthy.metadata.uid },
        ],
        [
          'shoots',
          { type: 'DELETED', uid: foobar.metadata.uid },
        ],
        [
          'shoots',
          { type: 'ADDED', uid: foobazUnhealthy.metadata.uid },
        ],
        [
          'shoots',
          { type: 'MODIFIED', uid: foobazUnhealthy.metadata.uid },
        ],
        [
          'shoots',
          { type: 'DELETED', uid: foobazUnhealthy.metadata.uid },
        ],
      ])
    })
  })

  describe('projects', function () {
    it('should watch projects', async function () {
      watches.projects(io, informer)

      expect(io.of).toHaveBeenCalledTimes(1)
      expect(io.of.mock.calls).toEqual([['/']])

      const uid = 4
      const bar = {
        metadata: {
          name: 'bar',
          uid,
        },
        spec: {
          members: [{
            kind: 'User',
            name: 'foo@example.org',
          }],
        },
      }

      informer.emit('add', bar)
      const modifiedBar = cloneDeep(bar)
      modifiedBar.spec.members = []
      informer.emit('update', modifiedBar, bar)
      informer.emit('delete', modifiedBar)

      await flushPromises()

      expect(logger.error).not.toHaveBeenCalled()

      const ids = [
        'admin@example.org',
        'foo@example.org',
      ].map(sha256)
      expect(Array.from(rooms.keys())).toEqual(ids)
      expect(nsp.to).toHaveBeenCalledTimes(5)

      const adminRoom = rooms.get(ids[0])
      expect(adminRoom.emit).toHaveBeenCalledTimes(3)
      expect(adminRoom.emit.mock.calls).toEqual([
        ['projects', { type: 'ADDED', uid }],
        ['projects', { type: 'MODIFIED', uid }],
        ['projects', { type: 'DELETED', uid }],
      ])

      const fooRoom = rooms.get(ids[1])
      expect(fooRoom.emit).toHaveBeenCalledTimes(2)
      expect(fooRoom.emit.mock.calls).toEqual([
        ['projects', { type: 'ADDED', uid }],
        ['projects', { type: 'DELETED', uid }],
      ])
    })
  })

  describe('seeds', function () {
    it('should watch seeds', async function () {
      watches.seeds(io, informer)

      const uid = 7
      const seed = {
        metadata: {
          name: 'seed-foo',
          uid,
        },
      }

      informer.emit('add', seed)
      informer.emit('update', seed)
      informer.emit('delete', seed)

      await flushPromises()

      const ids = ['seeds']

      expect(Array.from(rooms.keys())).toEqual(ids)
      expect(nsp.to).toHaveBeenCalledTimes(3)

      const seedsRoom = rooms.get(ids[0])
      expect(seedsRoom.emit).toHaveBeenCalledTimes(3)
      expect(seedsRoom.emit.mock.calls).toEqual([
        ['seeds', { type: 'ADDED', uid }],
        ['seeds', { type: 'MODIFIED', uid }],
        ['seeds', { type: 'DELETED', uid }],
      ])
    })
  })

  describe('leases', function () {
    const metadata = {
      projectName: 'foo',
      name: 'bar',
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
      },
    }

    const gitHubConfig = {
      pollIntervalSeconds: 10,
      syncThrottleSeconds: 2,
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

      expect(logger.warn).toHaveBeenCalledTimes(1)
      expect(ticketCache.on).toHaveBeenCalledTimes(0)
    })

    it('should add event listeners and create SyncManager', async function () {
      jest.spyOn(ticketCache, 'on')
      jest.spyOn(informer, 'on')

      watches.leases(io, informer, { signal })

      expect(io.of).toHaveBeenCalledTimes(1)
      expect(io.of).toHaveBeenCalledWith('/')

      expect(ticketCache.on).toHaveBeenCalledTimes(2)
      expect(ticketCache.on).toHaveBeenCalledWith('issue', expect.any(Function))
      expect(ticketCache.on).toHaveBeenCalledWith('comment', expect.any(Function))

      expect(SyncManager).toHaveBeenCalledTimes(1)
      expect(SyncManager).toHaveBeenCalledWith(expect.any(Function), {
        interval: gitHubConfig.pollIntervalSeconds * 1000,
        throttle: gitHubConfig.syncThrottleSeconds * 1000,
        signal,
      })
      const syncManagerInstance = SyncManager.mock.instances[0]
      expect(syncManagerInstance.sync).toHaveBeenCalledTimes(1)

      expect(informer.on).toHaveBeenCalledTimes(1)
      expect(informer.on).toHaveBeenCalledWith('update', expect.any(Function))
    })

    it('should create SyncManager with defaults', async () => {
      gitHubStub.mockReturnValue({})

      watches.leases(io, informer, { signal })

      expect(SyncManager).toHaveBeenCalledTimes(1)
      expect(SyncManager.mock.calls[0]).toEqual([
        expect.any(Function),
        {
          interval: 0,
          throttle: 0,
          signal,
        },
      ])
    })

    it('should call loadOpenIssuesAndComments with defaulted concurrency parameter', async () => {
      jest.spyOn(tickets, 'loadOpenIssues')
      tickets.loadOpenIssues.mockResolvedValue([])

      gitHubStub.mockReturnValue({})
      watches.leases(io, informer, { signal })

      expect(SyncManager).toHaveBeenCalledTimes(1)
      const [funcWithDefaultConcurrency] = SyncManager.mock.calls[0]
      await funcWithDefaultConcurrency()
      expect(pLimit).toHaveBeenCalledWith(10)
    })

    it('should call loadOpenIssuesAndComments with configured concurrency parameter', async () => {
      jest.spyOn(tickets, 'loadOpenIssues')
      tickets.loadOpenIssues.mockResolvedValue([])

      gitHubStub.mockReturnValue({ syncConcurrency: 42 })
      watches.leases(io, informer, { signal })

      expect(SyncManager).toHaveBeenCalledTimes(1)
      const [funcWithConfiguredConcurrency] = SyncManager.mock.calls[0]
      await funcWithConfiguredConcurrency()
      expect(pLimit).toHaveBeenCalledWith(42)
    })

    it('should emit ticket cache events to socket io', async () => {
      watches.leases(io, informer, { signal })

      expect(nsp.emit).toHaveBeenCalledTimes(1)
      expect(nsp.emit).toHaveBeenCalledWith('issues', issueEvent)

      const room = `shoots;${cache.getProjectNamespace(issueEvent.object.metadata.projectName)}/${issueEvent.object.metadata.name}`
      const mockRoom = rooms.get(room)
      expect(nsp.to).toHaveBeenCalledWith([room])
      expect(mockRoom.emit).toHaveBeenCalledTimes(1)
      expect(mockRoom.emit).toHaveBeenCalledWith('comments', issueEvent)
    })

    it('should listen to informer update events', async function () {
      jest.spyOn(informer, 'on')

      watches.leases(io, informer, { signal })

      expect(informer.on).toHaveBeenCalledTimes(1)
      expect(informer.on).toHaveBeenCalledWith('update', expect.any(Function))

      informer.emit('update', {})

      const syncManagerInstance = SyncManager.mock.instances[0]
      expect(syncManagerInstance.sync).toHaveBeenCalledTimes(2)
    })

    it('should should load issues and comments of all issues', async function () {
      const { test: { loadOpenIssuesAndComments } } = require('../dist/lib/watches/leases.cjs')

      const issues = fixtures.github.issues.list()
      const issueNumbers = issues.map(i => i.number)
      const comments = fixtures.github.comments.list()

      const t = await Promise.all(issues.map(i => tickets.fromIssue(i)))

      jest.spyOn(tickets, 'loadOpenIssues')
      jest.spyOn(tickets, 'loadIssueComments')

      tickets.loadOpenIssues.mockResolvedValue(t)

      const loadIssueCommentsMock = ({ number }) => comments.filter(comment => comment.number === number)
      tickets.loadIssueComments.mockImplementation(loadIssueCommentsMock)

      await loadOpenIssuesAndComments(10)

      expect(tickets.loadOpenIssues).toHaveBeenCalledTimes(1)
      expect(tickets.loadIssueComments).toHaveBeenCalledTimes(t.length)
      for (const number of issueNumbers) {
        expect(tickets.loadIssueComments).toHaveBeenCalledWith({ number })
      }
    })
  })
})
