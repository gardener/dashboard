//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { mockRequest } = require('@gardener-dashboard/request')
const { Store } = require('@gardener-dashboard/kube-client')
const cache = require('../../dist/lib/cache')

function createStore (items) {
  const store = new Store()
  store.replace(items)
  return store
}

describe('api', function () {
  let agent

  beforeAll(() => {
    agent = createAgent()

    cache.initialize({
      managedseeds: {
        store: createStore(fixtures.managedseeds.list()),
      },
      shoots: {
        store: createStore(fixtures.shoots.list()),
      },
    })
  })

  afterAll(() => {
    return agent.close()
  })

  beforeEach(() => {
    mockRequest.mockReset()
  })

  describe('managedseeds', function () {
    const user = fixtures.auth.createUser({ id: 'john.doe@example.org' })

    it('should return managed seeds in the garden namespace', async function () {
      mockRequest.mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())

      const res = await agent
        .get('/api/namespaces/garden/managedseeds')
        .set('cookie', await user.cookie)
        .expect('content-type', /json/)
        .expect(200)

      expect(mockRequest).toHaveBeenCalledTimes(1)
      expect(mockRequest.mock.calls).toMatchSnapshot()

      expect(res.body).toEqual([
        {
          metadata: {
            name: 'infra1-seed',
            namespace: 'garden',
            uid: 4,
          },
          spec: {
            shoot: {
              name: 'infra1-seed',
            },
          },
        },
      ])
    })

    it('should forbid listing managed seeds without garden access', async function () {
      mockRequest.mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess({ allowed: false }))

      const res = await agent
        .get('/api/namespaces/garden/managedseeds')
        .set('cookie', await user.cookie)
        .expect('content-type', /json/)
        .expect(403)

      expect(mockRequest).toHaveBeenCalledTimes(1)
      expect(mockRequest.mock.calls).toMatchSnapshot()
      expect(res.body).toEqual(expect.objectContaining({
        code: 403,
        reason: 'Forbidden',
        message: 'You are not allowed to list managed seeds in the garden namespace',
      }))
    })

    it('should reject non-garden namespaces', async function () {
      const res = await agent
        .get('/api/namespaces/garden-foo/managedseeds')
        .set('cookie', await user.cookie)
        .expect('content-type', /json/)
        .expect(422)

      expect(mockRequest).not.toHaveBeenCalled()
      expect(res.body).toEqual(expect.objectContaining({
        code: 422,
        reason: 'Unprocessable Entity',
        message: 'Managed seeds are restricted to the garden namespace',
      }))
    })
  })

  describe('managedseed-shoots', function () {
    const user = fixtures.auth.createUser({ id: 'john.doe@example.org' })

    it('should return managed seed shoots in the garden namespace', async function () {
      mockRequest
        .mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())
        .mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())

      const res = await agent
        .get('/api/namespaces/garden/managedseed-shoots')
        .set('cookie', await user.cookie)
        .expect('content-type', /json/)
        .expect(200)

      expect(mockRequest).toHaveBeenCalledTimes(2)
      expect(mockRequest.mock.calls).toMatchSnapshot()

      expect(res.body).toEqual([
        {
          metadata: {
            name: 'infra1-seed',
            namespace: 'garden',
            uid: 4,
          },
          status: {
            advertisedAddresses: [
              {
                name: 'external',
                url: 'https://api.infra1-seed.garden.shoot.test',
              },
            ],
          },
        },
      ])
    })

    it('should forbid listing managed seed shoots without full garden access', async function () {
      mockRequest
        .mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())
        .mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess({ allowed: false }))

      const res = await agent
        .get('/api/namespaces/garden/managedseed-shoots')
        .set('cookie', await user.cookie)
        .expect('content-type', /json/)
        .expect(403)

      expect(mockRequest).toHaveBeenCalledTimes(2)
      expect(mockRequest.mock.calls).toMatchSnapshot()
      expect(res.body).toEqual(expect.objectContaining({
        code: 403,
        reason: 'Forbidden',
        message: 'You are not allowed to list managed seed shoots in the garden namespace',
      }))
    })

    it('should reject non-garden namespaces for managed seed shoots', async function () {
      const res = await agent
        .get('/api/namespaces/garden-foo/managedseed-shoots')
        .set('cookie', await user.cookie)
        .expect('content-type', /json/)
        .expect(422)

      expect(mockRequest).not.toHaveBeenCalled()
      expect(res.body).toEqual(expect.objectContaining({
        code: 422,
        reason: 'Unprocessable Entity',
        message: 'Managed seed shoots are restricted to the garden namespace',
      }))
    })
  })
})
