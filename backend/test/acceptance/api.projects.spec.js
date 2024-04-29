//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { mockRequest } = require('@gardener-dashboard/request')
const { Store } = require('@gardener-dashboard/kube-client')
const cache = require('../../lib/cache')

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
      shoots: {
        store: createStore(fixtures.shoots.list())
      }
    })
  })

  afterAll(() => {
    cache.cache.resetTicketCache()
    return agent.close()
  })

  beforeEach(() => {
    fixtures.resetAll()
    mockRequest.mockReset()
  })

  describe('projects', function () {
    const user = fixtures.auth.createUser({
      id: 'foo@example.org',
      groups: ['group1']
    })
    const namespace = 'garden-foo'
    const annotations = {
      'billing.gardener.cloud/costObject': '8888888888'
    }
    const description = 'description'
    const purpose = 'purpose'

    beforeAll(() => {
      require('../../lib/services/projects').projectInitializationTimeout = 10
    })

    it('should return three projects', async function () {
      mockRequest.mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())

      const res = await agent
        .get('/api/namespaces')
        .set('cookie', await user.cookie)
        .expect('content-type', /json/)
        .expect(200)

      expect(mockRequest).toBeCalledTimes(1)
      expect(mockRequest.mock.calls).toMatchSnapshot()

      expect(res.body).toMatchSnapshot()
    })

    it('should return all projects', async function () {
      const user = fixtures.auth.createUser({ id: 'projects-viewer@example.org' })

      mockRequest.mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())

      const res = await agent
        .get('/api/namespaces')
        .set('cookie', await user.cookie)
        .expect('content-type', /json/)
        .expect(200)

      expect(mockRequest).toBeCalledTimes(1)
      expect(mockRequest.mock.calls).toMatchSnapshot()

      expect(res.body).toMatchSnapshot()
    })

    it('should return the foo project', async function () {
      mockRequest.mockImplementationOnce(fixtures.projects.mocks.get())

      const res = await agent
        .get(`/api/namespaces/${namespace}`)
        .set('cookie', await user.cookie)
        .expect('content-type', /json/)
        .expect(200)

      expect(mockRequest).toBeCalledTimes(1)
      expect(mockRequest.mock.calls).toMatchSnapshot()

      expect(res.body).toMatchSnapshot()
    })

    it('should reject request with authorization error', async function () {
      const user = fixtures.auth.createUser({ id: 'baz@example.org' })

      mockRequest.mockImplementationOnce(fixtures.projects.mocks.get())

      const res = await agent
        .get(`/api/namespaces/${namespace}`)
        .set('cookie', await user.cookie)
        .expect('content-type', /json/)
        .expect(403)

      expect(mockRequest).toBeCalledTimes(1)
      expect(mockRequest.mock.calls).toMatchSnapshot()

      expect(res.body).toMatchSnapshot({
        details: expect.any(Object)
      })
    })

    it('should create a project', async function () {
      mockRequest.mockImplementationOnce(fixtures.projects.mocks.create())
      mockRequest.mockImplementationOnce(fixtures.projects.mocks.watch({
        phase: 'Ready'
      }))

      const res = await agent
        .post('/api/namespaces')
        .set('cookie', await user.cookie)
        .send({
          metadata: {
            name: 'xyz',
            annotations
          },
          data: {
            purpose,
            description
          }
        })
        .expect('content-type', /json/)
        .expect(200)

      expect(mockRequest).toBeCalledTimes(2)
      expect(mockRequest.mock.calls).toMatchSnapshot()

      expect(res.body).toMatchSnapshot()
    })

    it('should timeout when creating a project', async function () {
      mockRequest.mockImplementationOnce(fixtures.projects.mocks.create())
      mockRequest.mockImplementationOnce(fixtures.projects.mocks.watch({
        phase: 'Pending'
      }))

      const res = await agent
        .post('/api/namespaces')
        .set('cookie', await user.cookie)
        .send({
          metadata: {
            name: 'my-project',
            annotations
          },
          data: {
            purpose,
            description
          }
        })
        .expect('content-type', /json/)
        .expect(504)

      expect(mockRequest).toBeCalledTimes(2)
      expect(mockRequest.mock.calls).toMatchSnapshot()

      expect(res.body).toMatchSnapshot({
        details: expect.any(Object)
      })
    })

    it('should update a project', async function () {
      mockRequest.mockImplementationOnce(fixtures.projects.mocks.patch())

      const res = await agent
        .put(`/api/namespaces/${namespace}`)
        .set('cookie', await user.cookie)
        .send({
          metadata: {
            annotations
          },
          data: {
            owner: 'baz@example.org',
            purpose,
            description
          }
        })
        .expect('content-type', /json/)
        .expect(200)

      expect(mockRequest).toBeCalledTimes(1)
      expect(mockRequest.mock.calls).toMatchSnapshot()

      expect(res.body).toMatchSnapshot()
    })

    it('should patch a project', async function () {
      mockRequest.mockImplementationOnce(fixtures.projects.mocks.patch())

      const res = await agent
        .patch(`/api/namespaces/${namespace}`)
        .set('cookie', await user.cookie)
        .send({
          data: {
            description: 'foobar'
          }
        })
        .expect('content-type', /json/)
        .expect(200)

      expect(mockRequest).toBeCalledTimes(1)
      expect(mockRequest.mock.calls).toMatchSnapshot()

      expect(res.body).toMatchSnapshot()
    })

    it('should delete a project', async function () {
      const namespace = 'garden-bar'

      mockRequest.mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())
      mockRequest.mockImplementationOnce(fixtures.projects.mocks.patch())
      mockRequest.mockImplementationOnce(fixtures.projects.mocks.delete())

      const res = await agent
        .delete(`/api/namespaces/${namespace}`)
        .set('cookie', await user.cookie)
        .expect('content-type', /json/)
        .expect(200)

      expect(mockRequest).toBeCalledTimes(3)
      expect(mockRequest.mock.calls).toMatchSnapshot()

      expect(res.body).toMatchSnapshot()
    })
  })
})
