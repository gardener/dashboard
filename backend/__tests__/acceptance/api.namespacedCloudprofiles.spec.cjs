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

  describe('namespaced cloudprofiles', function () {
    const user = fixtures.user.create({ id: 'john.doe@example.org' })
    const namespace = 'garden-local'

    it('should return all namespaced cloudprofiles for a namespace', async function () {
      mockRequest.mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())

      const res = await agent
        .get(`/api/namespaces/${namespace}/namespacedcloudprofiles`)
        .set('cookie', await user.cookie)
        .expect('content-type', /json/)

      expect(mockRequest).toHaveBeenCalledTimes(1)
      expect(mockRequest.mock.calls).toMatchSnapshot()

      expect(res.body).toMatchSnapshot()
    })

    it('should return 403 when user is not allowed to list namespaced cloudprofiles', async function () {
      mockRequest.mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess({
        allowed: false,
      }))

      const res = await agent
        .get(`/api/namespaces/${namespace}/namespacedcloudprofiles`)
        .set('cookie', await user.cookie)
        .expect(403)

      expect(mockRequest).toHaveBeenCalledTimes(1)
      expect(res.body.code).toBe(403)
      expect(res.body.message).toMatch(/not allowed to list namespaced cloudprofiles/)
    })
  })
})
