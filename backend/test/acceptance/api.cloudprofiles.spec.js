//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { pick, keyBy } = require('lodash')
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

  describe('cloudprofiles', function () {
    const id = 'john.doe@example.org'
    const user = fixtures.user.create({ id })

    it('should return all cloudprofiles', async function () {
      mockRequest.mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())

      const res = await agent
        .get('/api/cloudprofiles')
        .set('cookie', await user.cookie)
        .expect('content-type', /json/)

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
              resource: 'cloudprofiles',
              verb: 'list'
            }
          })
        }
      ])

      expect(res.body).toHaveLength(4)
      const cloudProfiles = keyBy(res.body, 'metadata.name')
      expect(cloudProfiles['infra1-profileName'].data.seedNames).toHaveLength(3)
      expect(cloudProfiles['infra1-profileName2'].data.seedNames).toHaveLength(2)
      expect(cloudProfiles['infra3-profileName'].data.seedNames).toHaveLength(1)
      expect(cloudProfiles['infra3-profileName2'].data.seedNames).toHaveLength(2)
    })
  })
})
