//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

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

  describe('members', function () {
    const namespace = 'garden-foo'
    const user = fixtures.auth.createUser({ id: 'bar@example.org' })

    it('should return all project members, including service accounts without entry in project', async function () {
      mockRequest.mockImplementationOnce(fixtures.projects.mocks.get())
      mockRequest.mockImplementationOnce(fixtures.serviceaccounts.mocks.list())

      const res = await agent
        .get(`/api/namespaces/${namespace}/members`)
        .set('cookie', await user.cookie)
        .expect('content-type', /json/)
        .expect(200)

      expect(mockRequest).toHaveBeenCalledTimes(2)
      expect(mockRequest.mock.calls).toMatchSnapshot()

      expect(res.body).toMatchSnapshot()
    })

    it('should not return members but respond "not found"', async function () {
      const namespace = 'garden-baz'

      const res = await agent
        .get(`/api/namespaces/${namespace}/members`)
        .set('cookie', await user.cookie)
        .expect('content-type', /json/)
        .expect(404)

      expect(mockRequest).not.toHaveBeenCalled()

      expect(res.body).toMatchSnapshot({
        details: expect.any(Object),
      })
    })

    it('should return a service account', async function () {
      const name = `system:serviceaccount:${namespace}:robot`

      mockRequest.mockImplementationOnce(fixtures.projects.mocks.get())
      mockRequest.mockImplementationOnce(fixtures.serviceaccounts.mocks.list())
      mockRequest.mockImplementationOnce(fixtures.serviceaccounts.mocks.createTokenRequest())

      const res = await agent
        .get(`/api/namespaces/${namespace}/members/${name}`)
        .set('cookie', await user.cookie)
        .expect('content-type', /json/)
        .expect(200)

      expect(mockRequest).toHaveBeenCalledTimes(3)
      expect(mockRequest.mock.calls).toMatchSnapshot()

      expect(res.body).toMatchSnapshot()
    })

    it('should reset a service account', async function () {
      const name = 'system:serviceaccount:garden-foo:robot'

      mockRequest.mockImplementationOnce(fixtures.projects.mocks.get())
      mockRequest.mockImplementationOnce(fixtures.serviceaccounts.mocks.list())
      mockRequest.mockImplementationOnce(fixtures.serviceaccounts.mocks.delete())
      mockRequest.mockImplementationOnce(fixtures.serviceaccounts.mocks.create())

      const res = await agent
        .post(`/api/namespaces/${namespace}/members/${name}`)
        .set('cookie', await user.cookie)
        .send({
          method: 'resetServiceAccount',
        })
        .expect(200)

      expect(mockRequest).toHaveBeenCalledTimes(4)
      expect(mockRequest.mock.calls).toMatchSnapshot()

      expect(res.body).toMatchSnapshot()
    })

    it('should add a project member', async function () {
      mockRequest.mockImplementationOnce(fixtures.projects.mocks.get())
      mockRequest.mockImplementationOnce(fixtures.serviceaccounts.mocks.list())
      mockRequest.mockImplementationOnce(fixtures.projects.mocks.patch())

      const res = await agent
        .post(`/api/namespaces/${namespace}/members`)
        .set('cookie', await user.cookie)
        .send({
          name: 'baz@example.org',
          roles: ['admin', 'owner'],
        })
        .expect('content-type', /json/)
        .expect(200)

      expect(mockRequest).toHaveBeenCalledTimes(3)
      expect(mockRequest.mock.calls).toMatchSnapshot()

      expect(res.body).toMatchSnapshot()
    })

    it('should not add member that is already a project member', async function () {
      mockRequest.mockImplementationOnce(fixtures.projects.mocks.get())
      mockRequest.mockImplementationOnce(fixtures.serviceaccounts.mocks.list())

      const res = await agent
        .post(`/api/namespaces/${namespace}/members`)
        .set('cookie', await user.cookie)
        .send({
          name: 'foo@example.org',
          roles: ['admin'],
        })
        .expect('content-type', /json/)
        .expect(409)

      expect(mockRequest).toHaveBeenCalledTimes(2)
      expect(mockRequest.mock.calls).toMatchSnapshot()

      expect(res.body).toMatchSnapshot({
        details: expect.any(Object),
      })
    })

    it('should update roles of a project member', async function () {
      const name = 'bar@example.org'

      mockRequest.mockImplementationOnce(fixtures.projects.mocks.get())
      mockRequest.mockImplementationOnce(fixtures.serviceaccounts.mocks.list())
      mockRequest.mockImplementationOnce(fixtures.projects.mocks.patch())

      const res = await agent
        .put(`/api/namespaces/${namespace}/members/${name}`)
        .set('cookie', await user.cookie)
        .send({
          roles: ['newRole'],
        })
        .expect('content-type', /json/)
        .expect(200)

      expect(mockRequest).toHaveBeenCalledTimes(3)
      expect(mockRequest.mock.calls).toMatchSnapshot()

      expect(res.body).toMatchSnapshot()
    })

    it('should delete a project member', async function () {
      const name = 'bar@example.org'

      mockRequest.mockImplementationOnce(fixtures.projects.mocks.get())
      mockRequest.mockImplementationOnce(fixtures.serviceaccounts.mocks.list())
      mockRequest.mockImplementationOnce(fixtures.projects.mocks.patch())

      const res = await agent
        .delete(`/api/namespaces/${namespace}/members/${name}`)
        .set('cookie', await user.cookie)
        .expect('content-type', /json/)
        .expect(200)

      expect(mockRequest).toHaveBeenCalledTimes(3)
      expect(mockRequest.mock.calls).toMatchSnapshot()

      expect(res.body).toMatchSnapshot()
    })

    it('should not delete a member that is not a project member', async function () {
      const name = 'baz@example.org'

      mockRequest.mockImplementationOnce(fixtures.projects.mocks.get())
      mockRequest.mockImplementationOnce(fixtures.serviceaccounts.mocks.list())

      const res = await agent
        .delete(`/api/namespaces/${namespace}/members/${name}`)
        .set('cookie', await user.cookie)
        .expect('content-type', /json/)
        .expect(200)

      expect(mockRequest).toHaveBeenCalledTimes(2)
      expect(mockRequest.mock.calls).toMatchSnapshot()

      expect(res.body).toMatchSnapshot()
    })

    it('should create a service account without roles', async function () {
      mockRequest.mockImplementationOnce(fixtures.projects.mocks.get())
      mockRequest.mockImplementationOnce(fixtures.serviceaccounts.mocks.list())
      mockRequest.mockImplementationOnce(fixtures.serviceaccounts.mocks.create())

      const res = await agent
        .post(`/api/namespaces/${namespace}/members`)
        .set('cookie', await user.cookie)
        .send({
          name: `system:serviceaccount:${namespace}:foo`,
          roles: [],
        })
        .expect('content-type', /json/)
        .expect(200)

      expect(mockRequest).toHaveBeenCalledTimes(3)
      expect(mockRequest.mock.calls).toMatchSnapshot()

      expect(res.body).toMatchSnapshot()
    })

    it('should delete a service account', async function () {
      const name = `system:serviceaccount:${namespace}:robot`

      mockRequest.mockImplementationOnce(fixtures.projects.mocks.get())
      mockRequest.mockImplementationOnce(fixtures.serviceaccounts.mocks.list())
      mockRequest.mockImplementationOnce(fixtures.serviceaccounts.mocks.delete())
      mockRequest.mockImplementationOnce(fixtures.projects.mocks.patch())

      const res = await agent
        .delete(`/api/namespaces/${namespace}/members/${name}`)
        .set('cookie', await user.cookie)
        .expect('content-type', /json/)
        .expect(200)

      expect(mockRequest).toHaveBeenCalledTimes(4)
      expect(mockRequest.mock.calls).toMatchSnapshot()

      expect(res.body).toMatchSnapshot()
    })

    it('should add a service account and assign member roles', async function () {
      mockRequest.mockImplementationOnce(fixtures.projects.mocks.get())
      mockRequest.mockImplementationOnce(fixtures.serviceaccounts.mocks.list())
      mockRequest.mockImplementationOnce(fixtures.serviceaccounts.mocks.create())
      mockRequest.mockImplementationOnce(fixtures.projects.mocks.patch())

      const res = await agent
        .post(`/api/namespaces/${namespace}/members`)
        .set('cookie', await user.cookie)
        .send({
          name: `system:serviceaccount:${namespace}:foo`,
          roles: ['myrole'],
          description: 'description',
        })
        .expect('content-type', /json/)
        .expect(200)

      expect(mockRequest).toHaveBeenCalledTimes(4)
      expect(mockRequest.mock.calls).toMatchSnapshot()

      expect(res.body).toMatchSnapshot()
    })

    it('should not create service account if already exists', async function () {
      mockRequest.mockImplementationOnce(fixtures.projects.mocks.get())
      mockRequest.mockImplementationOnce(fixtures.serviceaccounts.mocks.list())

      const res = await agent
        .post(`/api/namespaces/${namespace}/members`)
        .set('cookie', await user.cookie)
        .send({
          name: `system:serviceaccount:${namespace}:robot`,
          roles: ['myrole'],
        })
        .expect('content-type', /json/)
        .expect(409)

      expect(mockRequest).toHaveBeenCalledTimes(2)
      expect(mockRequest.mock.calls).toMatchSnapshot()

      expect(res.body).toMatchSnapshot({
        details: expect.any(Object),
      })
    })

    it('should update roles of existing service account', async function () {
      const name = `system:serviceaccount:${namespace}:robot`

      mockRequest.mockImplementationOnce(fixtures.projects.mocks.get())
      mockRequest.mockImplementationOnce(fixtures.serviceaccounts.mocks.list())
      mockRequest.mockImplementationOnce(fixtures.serviceaccounts.mocks.patch())
      mockRequest.mockImplementationOnce(fixtures.projects.mocks.patch())

      const res = await agent
        .put(`/api/namespaces/${namespace}/members/${name}`)
        .set('cookie', await user.cookie)
        .send({
          roles: ['myrole'],
          description: 'newDescription',
        })
        .expect('content-type', /json/)
        .expect(200)

      expect(mockRequest).toHaveBeenCalledTimes(4)
      expect(mockRequest.mock.calls).toMatchSnapshot()

      expect(res.body).toMatchSnapshot()
    })

    it('should add roles to existing service account without roles => add member', async function () {
      const name = `system:serviceaccount:${namespace}:robot-nomember`

      mockRequest.mockImplementationOnce(fixtures.projects.mocks.get())
      mockRequest.mockImplementationOnce(fixtures.serviceaccounts.mocks.list())
      mockRequest.mockImplementationOnce(fixtures.projects.mocks.patch())

      const res = await agent
        .put(`/api/namespaces/${namespace}/members/${name}`)
        .set('cookie', await user.cookie)
        .send({
          roles: ['myrole'],
        })
        .expect('content-type', /json/)
        .expect(200)

      expect(mockRequest).toHaveBeenCalledTimes(3)
      expect(mockRequest.mock.calls).toMatchSnapshot()

      expect(res.body).toMatchSnapshot()
    })

    it('should remove all roles of existing service account => delete member', async function () {
      const name = `system:serviceaccount:${namespace}:robot`

      mockRequest.mockImplementationOnce(fixtures.projects.mocks.get())
      mockRequest.mockImplementationOnce(fixtures.serviceaccounts.mocks.list())
      mockRequest.mockImplementationOnce(fixtures.projects.mocks.patch())

      const res = await agent
        .put(`/api/namespaces/${namespace}/members/${name}`)
        .set('cookie', await user.cookie)
        .send({
          roles: [],
        })
        .expect('content-type', /json/)
        .expect(200)

      expect(mockRequest).toHaveBeenCalledTimes(3)
      expect(mockRequest.mock.calls).toMatchSnapshot()

      expect(res.body).toMatchSnapshot()
    })

    it('should add a foreign service account as member to project', async function () {
      mockRequest.mockImplementationOnce(fixtures.projects.mocks.get())
      mockRequest.mockImplementationOnce(fixtures.serviceaccounts.mocks.list())
      mockRequest.mockImplementationOnce(fixtures.projects.mocks.patch())

      const res = await agent
        .post(`/api/namespaces/${namespace}/members`)
        .set('cookie', await user.cookie)
        .send({
          name: 'system:serviceaccount:othernamespace:fsa',
          roles: ['myrole'],
        })
        .expect('content-type', /json/)
        .expect(200)

      expect(mockRequest).toHaveBeenCalledTimes(3)
      expect(mockRequest.mock.calls).toMatchSnapshot()

      expect(res.body).toMatchSnapshot()
    })

    it('should not add a foreign service account without roles as member to project', async function () {
      mockRequest.mockImplementationOnce(fixtures.projects.mocks.get())
      mockRequest.mockImplementationOnce(fixtures.serviceaccounts.mocks.list())

      const res = await agent
        .post(`/api/namespaces/${namespace}/members`)
        .set('cookie', await user.cookie)
        .send({
          name: 'system:serviceaccount:othernamespace:fsa-noroles',
          roles: [],
        })
        .expect('content-type', /json/)
        .expect(200)

      expect(mockRequest).toHaveBeenCalledTimes(2)
      expect(mockRequest.mock.calls).toMatchSnapshot()

      expect(res.body).toMatchSnapshot()
    })

    it('should delete a foreign service account', async function () {
      const name = 'system:serviceaccount:garden-baz:robot'

      mockRequest.mockImplementationOnce(fixtures.projects.mocks.get())
      mockRequest.mockImplementationOnce(fixtures.serviceaccounts.mocks.list())
      mockRequest.mockImplementationOnce(fixtures.projects.mocks.patch())

      const res = await agent
        .delete(`/api/namespaces/${namespace}/members/${name}`)
        .set('cookie', await user.cookie)
        .expect('content-type', /json/)
        .expect(200)

      expect(mockRequest).toHaveBeenCalledTimes(3)
      expect(mockRequest.mock.calls).toMatchSnapshot()

      expect(res.body).toMatchSnapshot()
    })
  })
})
