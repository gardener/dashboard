//
// SPDX-FileCopyrightText: 2022 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { mockRequest } = require('@gardener-dashboard/request')
const EventSource = require('eventsource')
const { mockListIssues, mockListComments } = require('@octokit/rest')
const channels = require('../../lib/channels')
const tickets = require('../../lib/services/tickets')

function publishEvent (eventSource, channel, eventName, metadata) {
  const data = { object: { metadata } }
  const promise = new Promise(resolve => {
    const timeoutId = setTimeout(() => {
      eventSource.removeEventListener(eventName, listener)
      resolve()
    }, 10)
    const listener = e => {
      clearTimeout(timeoutId)
      resolve(JSON.parse(e.data).object.metadata)
    }
    eventSource.addEventListener(eventName, listener, { once: true })
  })
  const key = typeof channel === 'function'
    ? channel(metadata.labels)
    : channel
  channels[key].publish(eventName, data)
  return promise
}

function publishShoot (eventSource, metadata) {
  const channel = (labels = {}) => {
    const status = labels['shoot.gardener.cloud/status'] ?? 'healthy'
    return status !== 'healthy'
      ? 'unhealthyShoots'
      : 'shoots'
  }
  return publishEvent(eventSource, channel, 'shoots', metadata)
}

function publishIssue (eventSource, metadata) {
  return publishEvent(eventSource, 'tickets', 'issues', metadata)
}

function publishComment (eventSource, metadata) {
  return publishEvent(eventSource, 'tickets', 'comments', metadata)
}

describe('api', function () {
  let agent
  let eventSource

  beforeAll(() => {
    agent = createAgent()
  })

  afterAll(() => {
    return agent.close()
  })

  beforeEach(async () => {
    mockListIssues.mockReturnValue([
      fixtures.github.createIssue(1, 'foo'),
      fixtures.github.createIssue(2, 'bar', { comments: 1 }),
      fixtures.github.createIssue(3, 'foobar'),
      fixtures.github.createIssue(4, 'foo', { comments: 1, state: 'closed' })
    ])
    mockListComments.mockReturnValue([
      fixtures.github.createComment(1, 2),
      fixtures.github.createComment(2, 4)
    ])
    await tickets.loadOpenIssues()
  })

  afterEach(() => {
    eventSource?.close()
    jest.clearAllMocks()
  })

  describe('stream', function () {
    describe('when user is "foo"', () => {
      const user = fixtures.auth.createUser({
        id: 'foo@example.org'
      })

      it('should watch topic "shoots"', async () => {
        mockRequest.mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())
        mockRequest.mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())
        mockRequest.mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())

        eventSource = await agent
          .watch('shoots')
          .set('cookie', await user.cookie)
          .connect()

        expect(eventSource.readyState).toBe(EventSource.OPEN)
        expect(mockRequest).toBeCalledTimes(3)
        expect(mockRequest.mock.calls).toMatchSnapshot()

        let metadata = { namespace: 'garden-foo', name: 'test' }
        await expect(publishShoot(eventSource, metadata)).resolves.toEqual(metadata)

        metadata = { namespace: 'garden-bar', name: 'test' }
        await expect(publishShoot(eventSource, metadata)).resolves.toEqual(metadata)

        metadata = { namespace: 'garden-baz', name: 'test' }
        await expect(publishShoot(eventSource, metadata)).resolves.toBeUndefined()

        metadata = { projectName: 'foo', name: 'test' }
        await expect(publishIssue(eventSource, metadata)).resolves.toEqual(metadata)
        await expect(publishComment(eventSource, metadata)).resolves.toBeUndefined()
        await expect(publishEvent(eventSource, 'tickets', 'none', metadata)).resolves.toBeUndefined()

        metadata = { projectName: 'baz', name: 'test' }
        await expect(publishIssue(eventSource, metadata)).resolves.toBeUndefined()
      })

      it('should watch topic "shoots;garden-foo"', async () => {
        mockRequest.mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())

        eventSource = await agent
          .watch('shoots;garden-foo')
          .set('cookie', await user.cookie)
          .connect()

        expect(eventSource.readyState).toBe(EventSource.OPEN)
        expect(mockRequest).toBeCalledTimes(1)
        expect(mockRequest.mock.calls).toMatchSnapshot()

        let metadata = { namespace: 'garden-foo', name: 'test' }
        await expect(publishShoot(eventSource, metadata)).resolves.toEqual(metadata)

        metadata = { namespace: 'garden-bar', name: 'test' }
        await expect(publishShoot(eventSource, metadata)).resolves.toBeUndefined()

        metadata = { namespace: 'garden-baz', name: 'test' }
        await expect(publishShoot(eventSource, metadata)).resolves.toBeUndefined()
      })

      it('should watch topic "shoots;garden-foo/fooShoot"', async () => {
        mockRequest.mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())

        eventSource = await agent
          .watch('shoots;garden-foo/fooShoot')
          .set('cookie', await user.cookie)
          .connect()

        expect(eventSource.readyState).toBe(EventSource.OPEN)
        expect(mockRequest).toBeCalledTimes(1)
        expect(mockRequest.mock.calls).toMatchSnapshot()

        let metadata = { namespace: 'garden-foo', name: 'fooShoot' }
        await expect(publishShoot(eventSource, metadata)).resolves.toEqual(metadata)

        metadata = { namespace: 'garden-foo', name: 'test' }
        await expect(publishShoot(eventSource, metadata)).resolves.toBeUndefined()

        metadata = { projectName: 'foo', name: 'fooShoot' }
        await expect(publishIssue(eventSource, metadata)).resolves.toEqual(metadata)
        await expect(publishComment(eventSource, metadata)).resolves.toEqual(metadata)
      })
    })
    describe('when user is "admin"', () => {
      const user = fixtures.auth.createUser({
        id: 'admin@example.org'
      })

      it('should watch topic "shoots:unhealthy"', async () => {
        mockRequest.mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())

        eventSource = await agent
          .watch('shoots:unhealthy')
          .set('cookie', await user.cookie)
          .connect()

        expect(eventSource.readyState).toBe(EventSource.OPEN)
        expect(mockRequest).toBeCalledTimes(1)
        expect(mockRequest.mock.calls).toMatchSnapshot()

        let metadata = { namespace: 'garden-foo', name: 'test' }
        await expect(publishShoot(eventSource, metadata)).resolves.toBeUndefined()

        metadata = {
          namespace: 'garden-baz',
          name: 'test',
          labels: {
            'shoot.gardener.cloud/status': 'unheahlty'
          }
        }
        await expect(publishShoot(eventSource, metadata)).resolves.toEqual(metadata)
      })
    })
  })
})
