//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
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

  describe('resourceQuotas', function () {
    const user = fixtures.user.create({ id: 'john.doe@example.org' })

    const name = 'gardener'
    const namespace = 'garden-foo'

    it('should return a resource quota', async function () {
      mockRequest.mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())
      
      const res = await agent
        .get(`/api/namespaces/${namespace}/resource-quotas/${name}`)
        .set('cookie', await user.cookie)
        .expect('content-type', /json/)

      expect(mockRequest.mock.calls).toMatchSnapshot()
      expect(res.body).toMatchSnapshot()
    })
  })
})
