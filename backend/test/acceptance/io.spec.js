//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const assert = require('assert').strict
const pEvent = require('p-event')
const { filter, map, pick, groupBy, find, includes } = require('lodash')
const cache = require('../../lib/cache')
const { tickets } = require('../../lib/services')
const { projects, shoots, authorization } = require('../../lib/services/io')
const { mockAuthenticate } = require('../../lib/security')

jest.mock('../../lib/security', () => {
  const originalSecurity = jest.requireActual('../../lib/security')
  const mockAuthenticate = jest.fn()
  return {
    ...originalSecurity,
    mockAuthenticate,
    authenticateSocket: jest.fn().mockImplementation(options => {
      mockAuthenticate.mockImplementation(originalSecurity.authenticateSocket(options))
      return mockAuthenticate
    })
  }
})

describe('socket.io', function () {
  const id = 'foo@example.org'
  const groups = ['viewer']
  const user = fixtures.auth.createUser({ id, groups })

  async function assertUser () {
    assert.strictEqual(mockAuthenticate.mock.calls.length, 1)
    assert.strictEqual(mockAuthenticate.mock.calls[0].length, 1)
    const socket = mockAuthenticate.mock.calls[0][0]
    assert.ok(socket)
    assert.ok(socket.client)
    assert.ok(socket.client.user)
    assert.strictEqual(socket.client.user.id, id)
    assert.deepStrictEqual(socket.client.user.groups, groups)
    assert.deepStrictEqual(socket.client.user.auth, {
      bearer: await user.bearer
    })
  }

  let agent
  let socket
  let isAdminStub

  beforeAll(function () {
    cache.cache.resetTicketCache()
    agent = createAgent('io', cache)
  })

  afterAll(function () {
    (async () => {
      try {
        await agent.close()
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Failed to close socket server', err.message)
      }
    })()
  })

  beforeEach(async function () {
    isAdminStub = jest.spyOn(authorization, 'isAdmin').mockResolvedValue(false)
  })

  afterEach(function () {
    mockAuthenticate.mockClear()
    if (socket && socket.connected) {
      socket.destroy()
    }
  })

  const projectList = [
    { metadata: { name: 'foo' }, spec: { namespace: 'foo' } },
    { metadata: { name: 'bar' }, spec: { namespace: 'bar' } }
  ]

  describe('shoots', function () {
    const shootList = [
      { metadata: { namespace: 'foo', name: 'foo' } },
      { metadata: { namespace: 'foo', name: 'bar' } },
      { metadata: { namespace: 'foo', name: 'baz' } },
      { metadata: { namespace: 'bar', name: 'foo' } }
    ]

    function listShootsImplementation ({ namespace }) {
      const items = !namespace
        ? shootList
        : filter(shootList, ['metadata.namespace', namespace])
      return Promise.resolve({ items })
    }

    function readShootImplementation ({ namespace, name }) {
      const item = find(shootList, { metadata: { namespace, name } })
      return Promise.resolve(item)
    }

    function subscribeShoot (metadata) {
      return new Promise(resolve => socket.emit('subscribeShoot', metadata, resolve))
    }

    async function subscribeShoots (options = {}) {
      const asyncIterator = pEvent.iterator(socket, 'shoots', {
        timeout: 1000,
        resolutionEvents: ['subscription_done'],
        rejectionEvents: ['error', 'subscription_error']
      })
      const event = !options.namespace
        ? 'subscribeAllShoots'
        : 'subscribeShoots'
      socket.emit(event, options)
      const shootsByNamespace = {}
      for await (const namespacedEvent of asyncIterator) {
        for (const [key, items] of Object.entries(namespacedEvent.namespaces)) {
          shootsByNamespace[key] = (shootsByNamespace[key] || []).concat(map(items, 'object'))
        }
      }
      return shootsByNamespace
    }

    let listProjectsStub
    let listShootsStub
    let readShootStub
    let rooms

    beforeEach(async function () {
      listProjectsStub = jest.spyOn(projects, 'list').mockResolvedValue(projectList)
      listShootsStub = jest.spyOn(shoots, 'list').mockImplementation(listShootsImplementation)
      readShootStub = jest.spyOn(shoots, 'read').mockImplementation(readShootImplementation)
      socket = await agent.connect({
        cookie: await user.cookie
      })
      assert.strictEqual(socket.connected, true)
      await assertUser()
      const nsp = agent.io.sockets
      rooms = nsp.sockets.get(socket.id).rooms
    })

    it('should subscribe shoots for a namespace', async function () {
      const shootsByNamespace = await subscribeShoots({ namespace: 'foo' })
      expect(isAdminStub).toBeCalledTimes(0)
      expect(listProjectsStub).toBeCalledTimes(1)
      expect(listShootsStub).toBeCalledTimes(1)
      expect(shootsByNamespace).toEqual(pick(groupBy(shootList, 'metadata.namespace'), 'foo'))
      expect(rooms).toEqual(new Set([socket.id, 'shoots_foo']))
    })

    it('should subscribe shoots for all namespaces', async function () {
      isAdminStub.mockResolvedValueOnce(false)
      const shootsByNamespace = await subscribeShoots({})
      expect(isAdminStub).toBeCalledTimes(1)
      expect(listProjectsStub).toBeCalledTimes(1)
      expect(listShootsStub).toBeCalledTimes(2)
      expect(shootsByNamespace).toEqual(groupBy(shootList, 'metadata.namespace'))
      expect(rooms).toEqual(new Set([socket.id, 'shoots_foo', 'shoots_bar']))
    })

    it('should subscribe shoots for all namespaces as admin', async function () {
      isAdminStub.mockResolvedValueOnce(true)
      const shootsByNamespace = await subscribeShoots({})
      expect(isAdminStub).toBeCalledTimes(1)
      expect(listProjectsStub).toBeCalledTimes(1)
      expect(listShootsStub).toBeCalledTimes(1)
      expect(shootsByNamespace).toEqual(groupBy(shootList, 'metadata.namespace'))
      expect(rooms).toEqual(new Set([socket.id, 'shoots_foo', 'shoots_bar']))
    })

    it('should subscribe shoots with issues', async function () {
      isAdminStub.mockResolvedValueOnce(true)
      const shootsByNamespace = await subscribeShoots({ filter: 'issues' })
      expect(isAdminStub).toBeCalledTimes(1)
      expect(listProjectsStub).toBeCalledTimes(1)
      expect(listShootsStub).toBeCalledTimes(1)
      expect(shootsByNamespace).toEqual(groupBy(shootList, 'metadata.namespace'))
      expect(rooms).toEqual(new Set([socket.id, 'shoots_foo_issues', 'shoots_bar_issues']))
      await subscribeShoot({
        namespace: 'foo',
        name: 'bar'
      })
      expect(rooms).toEqual(new Set([socket.id, 'shoot_foo_bar']))
    })

    it('should subscribe single shoot', async function () {
      const metadata = {
        namespace: 'foo',
        name: 'bar'
      }
      const event = await subscribeShoot(metadata)
      expect(isAdminStub).toBeCalledTimes(0)
      expect(readShootStub).toBeCalledTimes(1)
      expect(listShootsStub).toBeCalledTimes(0)
      expect(event).toEqual(find(shootList, { metadata }))
      expect(rooms).toEqual(new Set([socket.id, 'shoot_foo_bar']))
    })
  })

  describe('tickets', function () {
    const commentList = fixtures.github.comments.list()
    let ticketCache
    let rooms

    async function emitSubscribe (...args) {
      const eventName = args[0].substring(9).toLowerCase()
      const asyncIterator = pEvent.iterator(socket, eventName, {
        timeout: 1000,
        resolutionEvents: ['subscription_done'],
        rejectionEvents: ['error', 'subscription_error']
      })
      socket.emit(...args)
      let items = []
      for await (const { events } of asyncIterator) {
        items = items.concat(map(events, 'object'))
      }
      return items
    }

    beforeEach(async function () {
      ticketCache = cache.getTicketCache()
      socket = await agent.connect({
        cookie: await user.cookie
      })
      assert.strictEqual(socket.connected, true)
      await assertUser()
      const nsp = agent.io.sockets
      rooms = nsp.sockets.get(socket.id).rooms
    })

    it('should subscribe tickets', async function () {
      const issues = ticketCache.getIssues()

      const actualIssues = await emitSubscribe('subscribeIssues')
      expect(actualIssues).toEqual(issues)
      expect(rooms).toEqual(new Set([socket.id, 'issues']))
    })

    it('should subscribe ticket comments', async function () {
      const namespace = 'garden-test'
      const name = 'test'
      const projectName = 'garden-test'
      const project = { metadata: { name: projectName } }
      const numbers = ticketCache.getIssueNumbersForNameAndProjectName({ name, projectName })
      const comments = filter(commentList, ({ number }) => includes(numbers, number))
      const expectedComments = map(comments, comment => tickets.fromComment(comment.number, name, projectName, comment))

      const findProjectByNamespaceStub = jest.spyOn(cache, 'findProjectByNamespace').mockReturnValue(project)

      const actualComments = await emitSubscribe('subscribeComments', { namespace, name })
      expect(findProjectByNamespaceStub).toBeCalledTimes(1)
      expect(actualComments).toEqual(expectedComments)
      expect(rooms).toEqual(new Set([socket.id, 'comments_garden-test/test']))
    })
  })
})
