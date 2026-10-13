//
// SPDX-FileCopyrightText: Contributors to the Gardener project
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
import { encrypt } from '../../lib/security/index.js'

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

    it('should reject cookies from different sessions', async function () {
      const otherUser = fixtures.auth.createUser({ id: 'other@example.org' })
      const cookies = await user.cookie
      const otherCookies = await otherUser.cookie
      const otherTokenCookie = otherCookies.split(';').find(cookie => cookie.startsWith('__Host-gTkn='))
      const splicedCookies = cookies
        .split(';')
        .map(cookie => cookie.startsWith('__Host-gTkn=') ? otherTokenCookie : cookie)
        .join(';')

      const res = await agent
        .get('/api/user/kubeconfig')
        .set('cookie', splicedCookies)
        .expect('content-type', /json/)
        .expect(401)

      expect(res.body).toEqual(expect.objectContaining({
        code: 401,
        reason: 'Unauthorized',
        message: 'Session cookie binding is invalid',
      }))
    })

    it('should reject a legacy session without an id token hash', async function () {
      const legacyUser = fixtures.auth.createUser({ id: 'legacy@example.org', ith: undefined })

      const res = await agent
        .get('/api/user/kubeconfig')
        .set('cookie', await legacyUser.cookie)
        .expect('content-type', /json/)
        .expect(401)

      expect(res.body).toEqual(expect.objectContaining({
        code: 401,
        reason: 'Unauthorized',
        message: 'Session cookie binding is invalid',
      }))
    })

    it('should reject an empty decrypted id token', async function () {
      const emptyTokenCookie = `__Host-gTkn=${await encrypt('')}`
      const cookies = (await user.cookie)
        .split(';')
        .map(cookie => cookie.startsWith('__Host-gTkn=') ? emptyTokenCookie : cookie)
        .join(';')

      const res = await agent
        .get('/api/user/kubeconfig')
        .set('cookie', cookies)
        .expect('content-type', /json/)
        .expect(401)

      expect(res.body).toEqual(expect.objectContaining({
        code: 401,
        reason: 'Unauthorized',
        message: 'The decrypted bearer token must not be empty',
      }))
    })

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
