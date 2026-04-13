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

  describe('resourceQuotas', function () {
    const user = fixtures.user.create({ id: 'john.doe@example.org' })
    const namespace = 'garden-foo'

    it('should return a resource quota', async function () {
      mockRequest.mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())

      const res = await agent
        .get(`/api/namespaces/${namespace}/resourcequotas`)
        .set('cookie', await user.cookie)
        .expect('content-type', /json/)

      expect(mockRequest.mock.calls).toMatchSnapshot()
      expect(res.body).toMatchSnapshot()
    })
  })
})
