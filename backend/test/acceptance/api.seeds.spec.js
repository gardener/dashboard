//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { keyBy, pick } = require('lodash')
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

  describe('seeds', function () {
    const id = 'john.doe@example.org'
    const user = fixtures.auth.createUser({ id })

    it('should return all seeds', async function () {
      mockRequest.mockImplementationOnce(fixtures.auth.reviewSelfSubjectAccess())

      const res = await agent
        .get('/api/seeds')
        .set('cookie', await user.cookie)
        .expect('content-type', /json/)
        .expect(200)

      expect(mockRequest).toBeCalledTimes(1)
      expect(mockRequest.mock.calls[0]).toEqual([
        {
          ...pick(fixtures.kube, [':scheme', ':authority']),
          authorization: `Bearer ${await user.bearer}`,
          ':method': 'post',
          ':path': '/apis/authorization.k8s.io/v1/selfsubjectaccessreviews'
        },
        {
          apiVersion: 'authorization.k8s.io/v1',
          kind: 'SelfSubjectAccessReview',
          spec: expect.objectContaining({
            resourceAttributes: {
              group: 'core.gardener.cloud',
              name: undefined,
              resource: 'seeds',
              verb: 'list'
            }
          })
        }
      ])

      expect(res.body).toHaveLength(8)
      const seeds = keyBy(res.body, 'metadata.name')
      expect(seeds['infra1-seed'].metadata.unreachable).toBe(false)
      expect(seeds['infra3-seed'].metadata.unreachable).toBe(true)
    })
  })
})
