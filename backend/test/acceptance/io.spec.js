//
// SPDX-FileCopyrightText: 2022 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { mockRequest } = require('@gardener-dashboard/request')
const { Store } = require('@gardener-dashboard/kube-client')
const { mockListIssues, mockListComments } = require('@octokit/rest')
const pEvent = require('p-event')
const tickets = require('../../lib/services/tickets')
const cache = require('../../lib/cache')
const io = require('../../lib/io')

function publishEvent (socket, room, eventName, metadata) {
  const data = { object: { metadata } }
  const promise = new Promise(resolve => {
    const timeoutId = setTimeout(() => {
      socket.off(eventName)
      resolve()
    }, 10)
    const listener = e => {
      clearTimeout(timeoutId)
      resolve(e.object.metadata)
    }
    socket.once(eventName, listener)
  })
  room.emit(eventName, data)
  return promise
}

function getRooms (socket, nsp) {
  return nsp.sockets.get(socket.id).rooms
}

function emit (socket, eventName, ...args) {
  return new Promise((resolve, reject) => {
    socket.emit(eventName, ...args, err => {
      if (err.statusCode === 200) {
        resolve()
      } else {
        reject(err)
      }
    })
  })
}

function subscribe (socket, ...args) {
  return emit(socket, 'subscribe', ...args)
}

function unsubscribe (socket, ...args) {
  return emit(socket, 'unsubscribe', ...args)
}

describe('api', function () {
  let agent
  let socket
  let nsp

  beforeAll(() => {
    cache.cache.resetTicketCache()
    const store = new Store()
    store.replace(fixtures.projects.list())
    cache.initialize({
      projects: { store }
    })
    agent = createAgent('io', cache)
    nsp = agent.io.sockets
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

  afterEach(function () {
    socket?.destroy()
    jest.clearAllMocks()
  })

  describe('events', function () {
    describe('when user is "foo"', () => {
      const user = fixtures.auth.createUser({
        id: 'foo@example.org'
      })
      let args

      beforeEach(async () => {
        socket = await agent.connect({
          cookie: await user.cookie
        })
      })

      it('should subscribe shoots for a single cluster', async function () {
        mockRequest.mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())

        await subscribe(socket, 'shoots', { namespace: 'garden-foo', name: 'fooShoot' })

        expect(mockRequest).toBeCalledTimes(1)
        expect(mockRequest.mock.calls).toMatchSnapshot()

        expect(getRooms(socket, nsp)).toEqual(new Set([
          socket.id,
          'shoots;garden-foo/fooShoot'
        ]))

        args = [
          socket,
          nsp.to('shoots;garden-foo/fooShoot'),
          'shoots',
          { namespace: 'garden-foo', name: 'fooShoot' }
        ]
        await expect(publishEvent(...args)).resolves.toEqual(args[3])

        args = [
          socket,
          nsp.to('shoots;garden-foo/barShoot'),
          'shoots',
          { namespace: 'garden-foo', name: 'barShoot' }
        ]
        await expect(publishEvent(...args)).resolves.toBeUndefined()
      })

      it('should subscribe shoots for a single namespace', async function () {
        mockRequest.mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())

        await subscribe(socket, 'shoots', { namespace: 'garden-foo' })

        expect(mockRequest).toBeCalledTimes(1)
        expect(mockRequest.mock.calls).toMatchSnapshot()

        expect(getRooms(socket, nsp)).toEqual(new Set([
          socket.id,
          'shoots;garden-foo'
        ]))

        await unsubscribe(socket, 'shoots')
        expect(getRooms(socket, nsp)).toEqual(new Set([
          socket.id
        ]))
      })

      it('should subscribe shoots for all namespace', async function () {
        mockRequest.mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())
        mockRequest.mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())
        mockRequest.mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())

        await subscribe(socket, 'shoots', { namespace: '_all' })

        expect(mockRequest).toBeCalledTimes(3)
        expect(mockRequest.mock.calls).toMatchSnapshot()

        expect(getRooms(socket, nsp)).toEqual(new Set([
          socket.id,
          'shoots;garden-foo',
          'shoots;garden-bar'
        ]))
      })

      it('should subscribe unhealthy shoots for all namespace', async function () {
        mockRequest.mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())
        mockRequest.mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())
        mockRequest.mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())

        await subscribe(socket, 'shoots', { namespace: '_all', labelSelector: 'shoot.gardener.cloud/status!=healthy' })

        expect(mockRequest).toBeCalledTimes(3)
        expect(mockRequest.mock.calls).toMatchSnapshot()

        expect(getRooms(socket, nsp)).toEqual(new Set([
          socket.id,
          'shoots:unhealthy;garden-foo',
          'shoots:unhealthy;garden-bar'
        ]))
      })

      it('should fail to subscribe shoots for a single namespace', async function () {
        mockRequest.mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess({ allowed: false }))

        await expect(subscribe(socket, 'shoots', { namespace: 'garden-baz' })).rejects.toEqual(expect.objectContaining({
          name: 'ForbiddenError',
          statusCode: 403,
          message: 'Insufficient authorization for shoot subscription'
        }))
      })

      it('should fail to subscribe shoots for all namespaces', async function () {
        mockRequest.mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())
        mockRequest.mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())
        mockRequest.mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess({ allowed: false }))

        await expect(subscribe(socket, 'shoots', { namespace: '_all' })).rejects.toEqual(expect.objectContaining({
          name: 'ForbiddenError',
          statusCode: 403,
          message: 'Insufficient authorization for shoot subscription'
        }))
      })

      it('should reject an invalid subscription', async function () {
        await expect(subscribe(socket, 'baz')).rejects.toEqual(expect.objectContaining({
          name: 'TypeError',
          statusCode: 500,
          message: 'Invalid subscription type - baz'
        }))
      })

      it('should reject an invalid unsubscription', async function () {
        await expect(unsubscribe(socket, 'baz')).rejects.toEqual(expect.objectContaining({
          name: 'TypeError',
          statusCode: 500,
          message: 'Invalid subscription type - baz'
        }))
      })
    })

    describe('when user is "admin"', () => {
      const user = fixtures.auth.createUser({
        id: 'admin@example.org'
      })

      beforeEach(async () => {
        socket = await agent.connect({
          cookie: await user.cookie
        })
      })

      it('should subscribe shoots for a single cluster', async function () {
        mockRequest.mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())

        await subscribe(socket, 'shoots', { namespace: 'garden-foo', name: 'fooShoot' })

        expect(mockRequest).toBeCalledTimes(1)
        expect(mockRequest.mock.calls).toMatchSnapshot()

        expect(getRooms(socket, nsp)).toEqual(new Set([
          socket.id,
          'shoots;garden-foo/fooShoot'
        ]))
      })

      it('should subscribe shoots for a single namespace', async function () {
        mockRequest.mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())

        await subscribe(socket, 'shoots', { namespace: 'garden-foo' })

        expect(mockRequest).toBeCalledTimes(1)
        expect(mockRequest.mock.calls).toMatchSnapshot()

        expect(getRooms(socket, nsp)).toEqual(new Set([
          socket.id,
          'shoots;garden-foo'
        ]))
      })

      it('should subscribe shoots for all namespace', async function () {
        mockRequest.mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())

        await subscribe(socket, 'shoots', { namespace: '_all' })

        expect(mockRequest).toBeCalledTimes(1)
        expect(mockRequest.mock.calls).toMatchSnapshot()

        expect(getRooms(socket, nsp)).toEqual(new Set([
          socket.id,
          'shoots:admin'
        ]))
      })

      it('should subscribe unhealthy shoots for all namespace', async function () {
        mockRequest.mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())

        await subscribe(socket, 'shoots', { namespace: '_all', labelSelector: 'shoot.gardener.cloud/status!=healthy' })

        expect(mockRequest).toBeCalledTimes(1)
        expect(mockRequest.mock.calls).toMatchSnapshot()

        expect(getRooms(socket, nsp)).toEqual(new Set([
          socket.id,
          'shoots:unhealthy:admin'
        ]))
      })
    })
  })

  describe('when user authentication fails', () => {
    let timestamp

    beforeEach(() => {
      timestamp = Math.floor(Date.now() / 1000)
    })

    it('should fail with error code ERR_JWT_TOKEN_EXPIRED', async function () {
      const exp = timestamp - 30
      const user = fixtures.auth.createUser({
        id: 'baz@example.org',
        exp
      })
      const cookie = await user.cookie
      await expect(agent.connect({ cookie })).rejects.toEqual(expect.objectContaining({
        name: 'Error',
        message: 'jwt expired',
        data: {
          statusCode: 401,
          code: 'ERR_JWT_TOKEN_EXPIRED'
        }
      }))
    })

    it('should fail with error code ERR_JWT_TOKEN_REFRESH_REQUIRED', async function () {
      const rti = 'abcdefg'
      const refreshAt = timestamp - 30
      const user = fixtures.auth.createUser({
        id: 'baz@example.org',
        rti,
        refresh_at: refreshAt
      })
      const cookie = await user.cookie
      await expect(agent.connect({ cookie })).rejects.toEqual(expect.objectContaining({
        name: 'Error',
        message: 'Token refresh required',
        data: {
          statusCode: 401,
          code: 'ERR_JWT_TOKEN_REFRESH_REQUIRED',
          rti,
          exp: refreshAt
        }
      }))
    })
  })

  describe('when the token will expire soon', () => {
    const setDisconnectTimeout = io.setDisconnectTimeout
    let mockSetDisconnectTimeout

    beforeEach(() => {
      mockSetDisconnectTimeout = jest.spyOn(io, 'setDisconnectTimeout')
        .mockImplementation(socket => setDisconnectTimeout(socket, 500))
    })

    afterEach(() => {
      mockSetDisconnectTimeout.mockRestore()
    })

    it('should close the underlying connection', async function () {
      const options = {
        id: 'baz@example.org',
        rti: 'abcdefg',
        refresh_at: Math.ceil(Date.now() / 1000) + 4
      }
      const user = fixtures.auth.createUser(options)
      socket = await agent.connect({
        cookie: await user.cookie
      })
      expect(mockSetDisconnectTimeout).toBeCalledTimes(1)
      expect(mockSetDisconnectTimeout.mock.calls[0]).toEqual([
        expect.objectContaining({
          data: {
            user: expect.objectContaining(options)
          }
        }),
        expect.toBeWithinRange(0, 5000)
      ])
      await expect(pEvent(socket, 'disconnect')).resolves.toEqual('io server disconnect')
    })
  })
})
