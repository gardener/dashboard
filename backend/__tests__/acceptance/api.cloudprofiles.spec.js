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

  describe('cloudprofiles', function () {
    const user = fixtures.user.create({ id: 'john.doe@example.org' })

    it('should return all cloudprofiles', async function () {
      mockRequest.mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())

      const res = await agent
        .get('/api/cloudprofiles')
        .set('cookie', await user.cookie)
        .expect('content-type', /json/)

      expect(mockRequest).toHaveBeenCalledTimes(1)
      expect(mockRequest.mock.calls).toMatchSnapshot()

      expect(res.body).toMatchSnapshot()
    })

    it('should return 403 when user is not allowed to list cloudprofiles', async function () {
      mockRequest.mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess({
        allowed: false,
      }))

      const res = await agent
        .get('/api/cloudprofiles')
        .set('cookie', await user.cookie)
        .expect(403)

      expect(mockRequest).toHaveBeenCalledTimes(1)
      expect(res.body.code).toBe(403)
      expect(res.body.message).toMatch(/You are not allowed to list cloudprofiles/)
    })

    describe('GET /api/cloudprofiles/:name', () => {
      it('should return a single cloud profile', async function () {
        mockRequest.mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())

        const profileName = 'infra1-profileName'
        const res = await agent
          .get(`/api/cloudprofiles/${profileName}`)
          .set('cookie', await user.cookie)
          .expect('content-type', /json/)
          .expect(200)

        expect(mockRequest).toHaveBeenCalledTimes(1)
        expect(res.body.metadata.name).toBe(profileName)
        expect(res.body.spec).toBeDefined()
      })

      it('should return 404 for unknown cloud profile', async function () {
        mockRequest.mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())

        const res = await agent
          .get('/api/cloudprofiles/nonexistent')
          .set('cookie', await user.cookie)
          .expect(404)

        expect(res.body.code).toBe(404)
      })

      it('should return 403 when user is not allowed to get cloudprofile', async function () {
        mockRequest.mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess({
          allowed: false,
        }))

        const res = await agent
          .get('/api/cloudprofiles/infra1-profileName')
          .set('cookie', await user.cookie)
          .expect(403)

        expect(res.body.code).toBe(403)
        expect(res.body.message).toMatch(/not allowed to get cloudprofile/)
      })
    })
  })
})
