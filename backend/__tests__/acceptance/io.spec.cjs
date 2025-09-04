//
// SPDX-FileCopyrightText: 2022 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { mockRequest } = require('@gardener-dashboard/request')
const { Store } = require('@gardener-dashboard/kube-client')
const { mockListIssues, mockListComments } = require('@octokit/core')
const { pEvent } = require('../../p-event-helper')
const createError = require('http-errors')
const tickets = require('../../dist/lib/services/tickets')
const cache = require('../../dist/lib/cache')
const ioHelper = require('../../dist/lib/io/helper')
const fixtures = require('../../__fixtures__')

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

async function synchronize (socket, ...args) {
  const {
    statusCode = 500,
    name = 'InternalError',
    message = 'Failed to synchronize shoots',
    items = [],
  } = await socket.timeout(1000).emitWithAck('synchronize', ...args)
  if (statusCode === 200) {
    return items
  }
  throw createError(statusCode, message, { name })
}

function createStore (items) {
  const store = new Store()
  store.replace(items)
  return store
}

describe('api', function () {
  let agent
  let socket
  let nsp

  beforeAll(() => {
    cache.cache.resetTicketCache()
    cache.initialize({
      projects: {
        store: createStore(fixtures.projects.list()),
      },
      shoots: {
        store: createStore(fixtures.shoots.list()),
      },
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
      fixtures.github.createIssue(4, 'foo', { comments: 1, state: 'closed' }),
    ])
    mockListComments.mockReturnValue([
      fixtures.github.createComment(1, 2),
      fixtures.github.createComment(2, 4),
    ])
    await tickets.loadOpenIssues()
  })

  afterEach(function () {
    socket?.destroy()
    jest.clearAllMocks()
  })

  describe('events', function () {
    describe('when user is "foo"', () => {
      const username = 'foo@example.org'
      const user = fixtures.auth.createUser({
        id: username,
      })
      let defaultRooms
      let args

      beforeEach(async () => {
        // authorization check for `canListProjects` and `canListSeeds`
        mockRequest
          .mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())
          .mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())
        socket = await agent.connect({
          cookie: await user.cookie,
        })
        defaultRooms = [
          socket.id,
          ioHelper.sha256(username),
        ]
        expect(mockRequest).toHaveBeenCalledTimes(2)
        mockRequest.mockClear()
      })

      it('should subscribe shoots for a single cluster', async function () {
        mockRequest.mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())

        await subscribe(socket, 'shoots', { namespace: 'garden-foo', name: 'fooShoot' })

        expect(mockRequest).toHaveBeenCalledTimes(1)
        expect(mockRequest.mock.calls).toMatchSnapshot()

        expect(getRooms(socket, nsp)).toEqual(new Set([
          ...defaultRooms,
          'seeds',
          'shoots;garden-foo/fooShoot',
        ]))

        args = [
          socket,
          nsp.to('shoots;garden-foo/fooShoot'),
          'shoots',
          { namespace: 'garden-foo', name: 'fooShoot' },
        ]
        await expect(publishEvent(...args)).resolves.toEqual(args[3])

        args = [
          socket,
          nsp.to('shoots;garden-foo/barShoot'),
          'shoots',
          { namespace: 'garden-foo', name: 'barShoot' },
        ]
        await expect(publishEvent(...args)).resolves.toBeUndefined()
      })

      it('should subscribe shoots for a single namespace', async function () {
        mockRequest.mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())

        await subscribe(socket, 'shoots', { namespace: 'garden-foo' })

        expect(mockRequest).toHaveBeenCalledTimes(1)
        expect(mockRequest.mock.calls).toMatchSnapshot()

        expect(getRooms(socket, nsp)).toEqual(new Set([
          ...defaultRooms,
          'seeds',
          'shoots;garden-foo',
        ]))

        await unsubscribe(socket, 'shoots')
        expect(getRooms(socket, nsp)).toEqual(new Set([
          ...defaultRooms,
          'seeds',
        ]))
      })

      it('should subscribe shoots for all namespace', async function () {
        mockRequest
          .mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())
          .mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())
          .mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())

        await subscribe(socket, 'shoots', { namespace: '_all' })

        expect(mockRequest).toHaveBeenCalledTimes(3)
        expect(mockRequest.mock.calls).toMatchSnapshot()

        expect(getRooms(socket, nsp)).toEqual(new Set([
          ...defaultRooms,
          'seeds',
          'shoots;garden-foo',
          'shoots;garden-bar',
        ]))
      })

      it('should subscribe unhealthy shoots for all namespace', async function () {
        mockRequest
          .mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())
          .mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())
          .mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())

        await subscribe(socket, 'shoots', { namespace: '_all', labelSelector: 'shoot.gardener.cloud/status!=healthy' })

        expect(mockRequest).toHaveBeenCalledTimes(3)
        expect(mockRequest.mock.calls).toMatchSnapshot()

        expect(getRooms(socket, nsp)).toEqual(new Set([
          ...defaultRooms,
          'seeds',
          'shoots:unhealthy;garden-foo',
          'shoots:unhealthy;garden-bar',
        ]))
      })

      it('should fail to subscribe shoots for a single namespace', async function () {
        mockRequest.mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess({ allowed: false }))

        await expect(subscribe(socket, 'shoots', { namespace: 'garden-baz' })).rejects.toEqual(expect.objectContaining({
          name: 'ForbiddenError',
          statusCode: 403,
          message: 'Insufficient authorization for shoot subscription',
        }))
      })

      it('should fail to subscribe shoots for all namespaces', async function () {
        mockRequest
          .mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())
          .mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())
          .mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess({ allowed: false }))

        await expect(subscribe(socket, 'shoots', { namespace: '_all' })).rejects.toEqual(expect.objectContaining({
          name: 'ForbiddenError',
          statusCode: 403,
          message: 'Insufficient authorization for shoot subscription',
        }))
      })

      it('should reject an invalid subscription', async function () {
        await expect(subscribe(socket, 'baz')).rejects.toEqual(expect.objectContaining({
          name: 'TypeError',
          statusCode: 500,
          message: 'Invalid subscription type - baz',
        }))
      })

      it('should reject an invalid unsubscription', async function () {
        await expect(unsubscribe(socket, 'baz')).rejects.toEqual(expect.objectContaining({
          name: 'TypeError',
          statusCode: 500,
          message: 'Invalid subscription type - baz',
        }))
      })

      it('should subscribe shoots for a single namespace', async function () {
        mockRequest.mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())

        await subscribe(socket, 'shoots', { namespace: 'garden-foo' })

        expect(mockRequest).toHaveBeenCalledTimes(1)
        expect(mockRequest.mock.calls).toMatchSnapshot()

        expect(getRooms(socket, nsp)).toEqual(new Set([
          ...defaultRooms,
          'seeds',
          'shoots;garden-foo',
        ]))

        await unsubscribe(socket, 'shoots')
        expect(getRooms(socket, nsp)).toEqual(new Set([
          ...defaultRooms,
          'seeds',
        ]))
      })

      it('should fail to synchronize a secret project', async function () {
        const items = await synchronize(socket, 'projects', [6])
        expect(items).toEqual([{
          apiVersion: 'v1',
          code: 404,
          details: {
            group: 'core.gardener.cloud',
            kind: 'Project',
            uid: 6,
          },
          kind: 'Status',
          message: 'Project with uid 6 does not exist',
          reason: 'NotFound',
          status: 'Failure',
        }])
      })
    })

    describe('when user is "admin"', () => {
      const username = 'admin@example.org'
      const user = fixtures.auth.createUser({
        id: username,
      })
      let defaultRooms

      beforeEach(async () => {
        // authorization check for `canListProjects` and `canListSeeds`
        mockRequest
          .mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())
          .mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())
        socket = await agent.connect({
          cookie: await user.cookie,
        })
        defaultRooms = [
          socket.id,
          ioHelper.sha256(username),
        ]
        expect(mockRequest).toHaveBeenCalledTimes(2)
        mockRequest.mockClear()
      })

      it('should subscribe shoots for a single cluster', async function () {
        mockRequest.mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())

        await subscribe(socket, 'shoots', { namespace: 'garden-foo', name: 'fooShoot' })

        expect(mockRequest).toHaveBeenCalledTimes(1)
        expect(mockRequest.mock.calls).toMatchSnapshot()

        expect(getRooms(socket, nsp)).toEqual(new Set([
          ...defaultRooms,
          'seeds',
          'shoots;garden-foo/fooShoot',
        ]))

        const items = await synchronize(socket, 'shoots', [1, 2])
        expect(items).toMatchSnapshot()
      })

      it('should subscribe shoots for a single namespace', async function () {
        mockRequest.mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())

        await subscribe(socket, 'shoots', { namespace: 'garden-foo' })

        expect(mockRequest).toHaveBeenCalledTimes(1)
        expect(mockRequest.mock.calls).toMatchSnapshot()

        expect(getRooms(socket, nsp)).toEqual(new Set([
          ...defaultRooms,
          'seeds',
          'shoots;garden-foo',
        ]))

        const items = await synchronize(socket, 'shoots', [1, 4])
        expect(items).toMatchSnapshot()
      })

      it('should subscribe shoots for all namespace', async function () {
        mockRequest.mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())

        await subscribe(socket, 'shoots', { namespace: '_all' })

        expect(mockRequest).toHaveBeenCalledTimes(1)
        expect(mockRequest.mock.calls).toMatchSnapshot()

        expect(getRooms(socket, nsp)).toEqual(new Set([
          ...defaultRooms,
          'seeds',
          'shoots:admin',
        ]))

        const items = await synchronize(socket, 'shoots', [1, 4])
        expect(items).toMatchSnapshot()
      })

      it('should subscribe unhealthy shoots for all namespace', async function () {
        mockRequest.mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())

        await subscribe(socket, 'shoots', { namespace: '_all', labelSelector: 'shoot.gardener.cloud/status!=healthy' })

        expect(mockRequest).toHaveBeenCalledTimes(1)
        expect(mockRequest.mock.calls).toMatchSnapshot()

        expect(getRooms(socket, nsp)).toEqual(new Set([
          ...defaultRooms,
          'seeds',
          'shoots:unhealthy:admin',
        ]))
      })

      it('should fail to synchronize cats', async function () {
        mockRequest.mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())

        await expect(synchronize(socket, 'cats', [42]))
          .rejects
          .toThrow('Invalid synchronization type - cats')
      })

      it('should synchronize a project', async function () {
        const items = await synchronize(socket, 'projects', [2])
        expect(items).toMatchSnapshot()
      })
    })
  })

  describe('when user authentication fails', () => {
    let timestamp

    beforeEach(() => {
      mockRequest.mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())
      timestamp = Math.floor(Date.now() / 1000)
    })

    it('should fail with error code ERR_JWT_TOKEN_EXPIRED', async function () {
      const exp = timestamp - 30
      const user = fixtures.auth.createUser({
        id: 'baz@example.org',
        exp,
      })
      const cookie = await user.cookie
      await expect(agent.connect({ cookie })).rejects.toEqual(expect.objectContaining({
        name: 'Error',
        message: 'jwt expired',
        data: {
          statusCode: 401,
          code: 'ERR_JWT_TOKEN_EXPIRED',
        },
      }))
    })

    it('should fail with error code ERR_JWT_TOKEN_REFRESH_REQUIRED', async function () {
      const rti = 'abcdefg'
      const refreshAt = timestamp - 30
      const user = fixtures.auth.createUser({
        id: 'baz@example.org',
        rti,
        refresh_at: refreshAt,
      })
      const cookie = await user.cookie
      await expect(agent.connect({ cookie })).rejects.toEqual(expect.objectContaining({
        name: 'Error',
        message: 'Token refresh required',
        data: {
          statusCode: 401,
          code: 'ERR_JWT_TOKEN_REFRESH_REQUIRED',
          rti,
          exp: refreshAt,
        },
      }))
    })
  })

  describe('when the token will expire soon', () => {
    const setDisconnectTimeout = ioHelper.setDisconnectTimeout
    let mockSetDisconnectTimeout

    beforeEach(() => {
      mockSetDisconnectTimeout = jest.spyOn(ioHelper, 'setDisconnectTimeout')
        .mockImplementation(socket => setDisconnectTimeout(socket, 500))
    })

    afterEach(() => {
      mockSetDisconnectTimeout.mockRestore()
    })

    it('should close the underlying connection', async function () {
      const username = 'baz@example.org'
      const options = {
        id: username,
        rti: 'abcdefg',
        refresh_at: Math.ceil(Date.now() / 1000) + 4,
      }
      const user = fixtures.auth.createUser(options)
      // authorization check for `canListProjects` and `canListSeeds`
      mockRequest
        .mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())
        .mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())
      socket = await agent.connect({
        cookie: await user.cookie,
      })
      expect(mockRequest).toHaveBeenCalledTimes(2)
      expect(mockSetDisconnectTimeout).toHaveBeenCalledTimes(1)
      expect(mockSetDisconnectTimeout.mock.calls[0]).toEqual([
        expect.objectContaining({
          data: {
            user: expect.objectContaining(options),
          },
        }),
        expect.toBeWithinRange(0, 5000),
      ])
      await expect(pEvent(socket, 'disconnect')).resolves.toEqual('io server disconnect')
    })
  })
})
