//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} from 'vitest'
import request from '@gardener-dashboard/request'

const { mockRequest } = request

describe('api', function () {
  let agent

  beforeAll(async () => {
    agent = await createAgent()
  })

  afterAll(() => {
    return agent.close()
  })

  beforeEach(() => {
    mockRequest.mockReset()
  })
  describe('user', function () {
    const user = fixtures.auth.createUser({ id: 'bar@example.org' })

    it('should return selfsubjectrules for the user', async function () {
      mockRequest.mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectRules())

      const res = await agent
        .post('/api/user/subjectrules')
        .set('cookie', await user.cookie)
        .send({
          namespace: 'garden-foo',
        })
        .expect('content-type', /json/)
        .expect(200)

      expect(mockRequest).toHaveBeenCalledTimes(1)
      expect(mockRequest.mock.calls).toMatchSnapshot()

      expect(res.body).toMatchSnapshot()
    })

    it('should return the kubeconfig data the user', async function () {
      const res = await agent
        .get('/api/user/kubeconfig')
        .set('cookie', await user.cookie)
        .expect('content-type', /json/)
        .expect(200)

      expect(mockRequest).not.toHaveBeenCalled()

      expect(res.body).toMatchSnapshot()
    })

    it('should return the current user groups', async function () {
      const groups = ['group-a', 'group-b']
      const groupUser = fixtures.auth.createUser({
        id: 'bar@example.org',
        groups,
      })
      mockRequest.mockImplementationOnce(fixtures.auth.mocks.reviewToken())

      const res = await agent
        .get('/api/user/groups')
        .set('cookie', await groupUser.cookie)
        .expect('content-type', /json/)
        .expect(200)

      expect(mockRequest).toHaveBeenCalledTimes(1)
      expect(mockRequest.mock.calls[0][0][':path']).toBe('/apis/authentication.k8s.io/v1/tokenreviews')
      expect(res.body).toEqual(groups)
    })

    it('should return an empty list when TokenReview omits groups', async function () {
      mockRequest.mockImplementationOnce(fixtures.auth.mocks.reviewToken())

      const res = await agent
        .get('/api/user/groups')
        .set('cookie', await user.cookie)
        .expect('content-type', /json/)
        .expect(200)

      expect(res.body).toEqual([])
    })

    it('should reject a TokenReview username that does not match the session user', async function () {
      const mismatchedUser = fixtures.auth.createUser({
        id: 'bar@example.org',
        bearerId: 'other@example.org',
      })
      mockRequest.mockImplementationOnce(fixtures.auth.mocks.reviewToken())

      const res = await agent
        .get('/api/user/groups')
        .set('cookie', await mismatchedUser.cookie)
        .expect('content-type', /json/)
        .expect(401)

      expect(res.body).toEqual(expect.objectContaining({
        code: 401,
        reason: 'Unauthorized',
        message: 'Bearer token user does not match dashboard session user',
      }))
    })

    it('should reject unauthenticated requests for user groups', async function () {
      const res = await agent
        .get('/api/user/groups')
        .expect('content-type', /json/)
        .expect(401)

      expect(res.status).toBe(401)
    })
  })
})
