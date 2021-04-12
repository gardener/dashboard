//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const assert = require('assert').strict
const pEvent = require('p-event')
const { filter, map, pick, groupBy, find, includes } = require('lodash')
const kubeClient = require('@gardener-dashboard/kube-client')
const cache = require('../../lib/cache')
const { projects, shoots, authorization, tickets } = require('../../lib/services')

describe('socket.io', function () {
  const id = 'foo@example.org'
  const user = fixtures.auth.createUser({ id })

  let agent
  let socket

  const client = {}
  let createClientStub
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
    createClientStub = jest.spyOn(kubeClient, 'createClient').mockReturnValue(client)
    isAdminStub = jest.spyOn(authorization, 'isAdmin').mockResolvedValue(false)
  })

  afterEach(function () {
    if (socket && socket.connected) {
      socket.destroy()
    }
  })

  const projectList = [
    { metadata: { namespace: 'foo', name: 'foo' } },
    { metadata: { namespace: 'bar', name: 'bar' } }
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

    async function emitSubscribe (...args) {
      const asyncIterator = pEvent.iterator(socket, 'namespacedEvents', {
        timeout: 1000,
        resolutionEvents: ['shootSubscriptionDone', 'batchNamespacedEventsDone'],
        rejectionEvents: ['error', 'subscription_error']
      })
      socket.emit(...args)
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

    beforeEach(async function () {
      listProjectsStub = jest.spyOn(projects, 'list').mockResolvedValue(projectList)
      listShootsStub = jest.spyOn(shoots, 'list').mockImplementation(listShootsImplementation)
      readShootStub = jest.spyOn(shoots, 'read').mockImplementation(readShootImplementation)
      socket = await agent.connect('/shoots', {
        cookie: await user.cookie
      })
      assert.strictEqual(socket.connected, true)
      assert.strictEqual(createClientStub.mock.calls.length, 1)
      assert.deepStrictEqual(createClientStub.mock.calls[0][0], {
        auth: {
          bearer: await user.bearer
        }
      })
    })

    it('should subscribe shoots for a namespace', async function () {
      const shootsByNamespace = await emitSubscribe('subscribeShoots', {
        namespaces: [{ namespace: 'foo' }]
      })
      expect(isAdminStub).toBeCalledTimes(0)
      expect(listProjectsStub).toBeCalledTimes(1)
      expect(listShootsStub).toBeCalledTimes(1)
      expect(shootsByNamespace).toEqual(pick(groupBy(shootList, 'metadata.namespace'), 'foo'))
    })

    it('should subscribe shoots for all namespaces', async function () {
      isAdminStub.mockResolvedValueOnce(false)
      const shootsByNamespace = await emitSubscribe('subscribeAllShoots', {})
      expect(isAdminStub).toBeCalledTimes(1)
      expect(listProjectsStub).toBeCalledTimes(1)
      expect(listShootsStub).toBeCalledTimes(2)
      expect(shootsByNamespace).toEqual(groupBy(shootList, 'metadata.namespace'))
    })

    it('should subscribe shoots for all namespaces as admin', async function () {
      isAdminStub.mockResolvedValueOnce(true)
      const shootsByNamespace = await emitSubscribe('subscribeAllShoots', {})
      expect(isAdminStub).toBeCalledTimes(1)
      expect(listProjectsStub).toBeCalledTimes(1)
      expect(listShootsStub).toBeCalledTimes(1)
      expect(shootsByNamespace).toEqual(groupBy(shootList, 'metadata.namespace'))
    })

    it('should subscribe single shoot', async function () {
      const metadata = {
        namespace: 'foo',
        name: 'bar'
      }
      const event = await new Promise(resolve => socket.emit('subscribeShoot', metadata, resolve))
      expect(isAdminStub).toBeCalledTimes(0)
      expect(readShootStub).toBeCalledTimes(1)
      expect(listShootsStub).toBeCalledTimes(0)
      expect(event).toEqual(find(shootList, { metadata }))
    })
  })

  describe('tickets', function () {
    const commentList = fixtures.github.comments.list()
    let ticketCache

    async function emitSubscribe (...args) {
      const asyncIterator = pEvent.iterator(socket, 'events', {
        timeout: 1000,
        resolutionEvents: ['batchEventsDone'],
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
      socket = await agent.connect('/tickets', {
        cookie: await user.cookie
      })
      assert.strictEqual(socket.connected, true)
      assert.strictEqual(createClientStub.mock.calls.length, 1)
      assert.deepStrictEqual(createClientStub.mock.calls[0][0], {
        auth: {
          bearer: await user.bearer
        }
      })
    })

    it('should subscribe tickets', async function () {
      const issues = ticketCache.getIssues()

      const actualIssues = await emitSubscribe('subscribeIssues')
      expect(actualIssues).toEqual(issues)
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
    })
  })
})
