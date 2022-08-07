//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const EventEmitter = require('events')
const _ = require('lodash')
const logger = require('../lib/logger')
const config = require('../lib/config')
const watches = require('../lib/watches')
const cache = require('../lib/cache')
const { bootstrapper } = require('../lib/services/terminals')
const tickets = require('../lib/services/tickets')
const channels = require('../lib/channels')

const uuidPattern = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/

class MockSession extends EventEmitter {
  push = jest.fn()
  isConnected = true
  state = {
    events: ['shoots', 'issues']
  }

  constructor (channel, metadata = null) {
    super()
    this.state.metadata = metadata
    if (Reflect.has(metadata, 'name')) {
      this.state.events.push('comments')
    }
  }
}

describe('watches', function () {
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
      watches.seeds(informer)
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
    let fooSession
    let fooBarSession
    let fooBazSession
    let fooIssuesSession

    let deleteTicketsStub
    let bootstrapResourceStub
    let removeResourceStub
    let findProjectByNamespaceStub

    beforeEach(() => {
      fooSession = new MockSession('shoots', { namespace: 'foo' })
      channels.tickets.register(fooSession)
      channels.shoots.register(fooSession)
      fooBarSession = new MockSession('shoots', { namespace: 'foo', name: 'bar' })
      channels.tickets.register(fooBarSession)
      channels.shoots.register(fooBarSession)
      fooBazSession = new MockSession('shoots', { namespace: 'foo', name: 'baz' })
      channels.tickets.register(fooBazSession)
      channels.shoots.register(fooBazSession)
      fooIssuesSession = new MockSession('unhealthyShoots', { namespace: 'foo' })
      channels.tickets.register(fooIssuesSession)
      channels.unhealthyShoots.register(fooIssuesSession)

      shootsWithIssues = new Set()
      deleteTicketsStub = jest.spyOn(tickets, 'deleteTickets')
      bootstrapResourceStub = jest.spyOn(bootstrapper, 'bootstrapResource').mockReturnValue()
      removeResourceStub = jest.spyOn(bootstrapper.bootstrapState, 'removeResource').mockReturnValue()
      findProjectByNamespaceStub = jest.spyOn(cache, 'findProjectByNamespace').mockImplementation(namespace => {
        return _.find(projectList, ['spec.namespace', namespace])
      })
    })

    afterEach(() => {
      for (const channel of Object.values(channels)) {
        for (const session of channel.activeSessions) {
          channel.deregister(session)
        }
      }
    })

    it('should watch shoots without issues', async function () {
      watches.shoots(informer)

      informer.emit('add', foobar)
      informer.emit('update', foobar)
      informer.emit('delete', foobar)

      const expectedCalls = [
        [
          { type: 'ADDED', object: foobar },
          'shoots',
          expect.stringMatching(uuidPattern)
        ],
        [
          { type: 'MODIFIED', object: foobar },
          'shoots',
          expect.stringMatching(uuidPattern)
        ],
        [
          { type: 'DELETED', object: foobar },
          'shoots',
          expect.stringMatching(uuidPattern)
        ]
      ]

      expect(logger.error).not.toBeCalled()
      expect(bootstrapResourceStub).toBeCalledTimes(2)
      expect(removeResourceStub).toBeCalledTimes(1)
      expect(removeResourceStub.mock.calls).toEqual([[foobar]])
      expect(deleteTicketsStub).toBeCalledTimes(1)
      expect(findProjectByNamespaceStub).toBeCalledTimes(1)
      expect(findProjectByNamespaceStub.mock.calls).toEqual([['foo']])

      expect(fooSession.push).toBeCalledTimes(3)
      expect(fooSession.push.mock.calls).toEqual(expectedCalls)
      expect(fooBarSession.push).toBeCalledTimes(3)
      expect(fooBarSession.push.mock.calls).toEqual(expectedCalls)
      expect(fooBazSession.push).toBeCalledTimes(0)
      expect(fooIssuesSession.push).toBeCalledTimes(0)
    })

    it('should watch shoots with issues', async function () {
      watches.shoots(informer, { shootsWithIssues })

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

      const expectedCalls = [
        [
          { type: 'ADDED', object: foobarUnhealthy },
          'shoots',
          expect.stringMatching(uuidPattern)
        ],
        [
          { type: 'DELETED', object: foobar },
          'shoots',
          expect.stringMatching(uuidPattern)
        ],
        [
          { type: 'ADDED', object: foobazUnhealthy },
          'shoots',
          expect.stringMatching(uuidPattern)
        ],
        [
          { type: 'MODIFIED', object: foobazUnhealthy },
          'shoots',
          expect.stringMatching(uuidPattern)
        ],
        [
          { type: 'DELETED', object: foobazUnhealthy },
          'shoots',
          expect.stringMatching(uuidPattern)
        ]
      ]

      expect(bootstrapResourceStub).toBeCalledTimes(4)
      expect(removeResourceStub).toBeCalledTimes(1)
      expect(removeResourceStub.mock.calls).toEqual([[foobazUnhealthy]])
      expect(deleteTicketsStub).toBeCalledTimes(1)
      expect(fooSession.push).toBeCalledTimes(5)
      expect(fooIssuesSession.push).toBeCalledTimes(5)
      expect(fooIssuesSession.push.mock.calls).toEqual(expectedCalls)
    })

    it('should delete tickets for a deleted shoot', async function () {
      deleteTicketsStub.mockImplementation(({ projectName, name }) => {
        const namespace = _.find(projectList, ['metadata.name', projectName]).spec.namespace
        if (namespace === 'foo' && name === 'baz') {
          throw new Error('TicketError')
        }
      })

      watches.shoots(informer)

      informer.emit('delete', foobar)
      informer.emit('delete', foobaz)

      expect(logger.error).toBeCalledTimes(1)
      expect(removeResourceStub).toBeCalledTimes(2)
      expect(removeResourceStub.mock.calls).toEqual([[foobar], [foobaz]])
      expect(deleteTicketsStub).toBeCalledTimes(2)
    })
  })

  describe('tickets', function () {
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
      watches.tickets(ticketCache)
      expect(logger.warn).toBeCalledTimes(1)
    })

    it('should watch tickets', async function () {
      gitHubStub.mockReturnValue(true)
      loadOpenIssuesStub.mockRejectedValueOnce(Object.assign(new Error('Service Unavailable'), {
        status: 503
      }))

      await watches.tickets(ticketCache, { minTimeout: 1 })
      expect(loadOpenIssuesStub).toBeCalledTimes(2)
      expect(logger.info).toBeCalledTimes(2)
    })

    it('should fail to fetch tickets', async function () {
      gitHubStub.mockReturnValue(true)
      loadOpenIssuesStub.mockRejectedValueOnce(new Error('Unexpected'))

      await watches.tickets(ticketCache)
      expect(loadOpenIssuesStub).toBeCalledTimes(1)
      expect(logger.error).toBeCalledTimes(1)
    })
  })
})
