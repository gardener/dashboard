//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const services = require('../../lib/services')
const { WatchBuilder } = require('@gardener-dashboard/kube-client')
const { mockRequest } = require('@gardener-dashboard/request')

describe('api', function () {
  let agent

  beforeAll(() => {
    agent = createAgent()
  })

  afterAll(() => {
    return agent.close()
  })

  beforeEach(() => {
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
      services.projects.projectInitializationTimeout = 30
    })

    beforeEach(() => {
      WatchBuilder.create.mockClear()
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
      const user = fixtures.auth.createUser({ id: 'admin@example.org' })

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
      mockRequest.mockImplementationOnce(fixtures.projects.mocks.create({
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

      expect(WatchBuilder.create).toBeCalledTimes(1)
      expect(mockRequest).toBeCalledTimes(1)
      expect(mockRequest.mock.calls).toMatchSnapshot()

      expect(res.body).toMatchSnapshot()
    })

    it('should timeout when creating a project', async function () {
      mockRequest.mockImplementationOnce(fixtures.projects.mocks.create({
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

      expect(WatchBuilder.create).toBeCalledTimes(1)
      expect(mockRequest).toBeCalledTimes(1)
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

      mockRequest.mockImplementationOnce(fixtures.shoots.mocks.list())
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
