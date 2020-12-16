//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { pick } = require('lodash')
const SwaggerParser = require('swagger-parser')
const { mockRequest } = require('@gardener-dashboard/request')

describe('openapi', function () {
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

  it('should fetch shoot openapi schema', async function () {
    const id = 'john.doe@example.org'
    const user = fixtures.auth.createUser({ id })

    const shootDefinitions = {
      'com.github.gardener.gardener.pkg.apis.core.v1beta1.Shoot': {
        type: 'object'
      }
    }

    mockRequest.mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())
    mockRequest.mockResolvedValueOnce({
      definitions: {
        ...shootDefinitions,
        foo: {
          type: 'object'
        }
      }
    })
    const dereferenceStub = jest.spyOn(SwaggerParser, 'dereference').mockImplementation(obj => obj)

    const res = await agent
      .get('/api/openapi')
      .set('cookie', await user.cookie)
      .expect('content-type', /json/)
      .expect(200)

    expect(mockRequest).toBeCalledTimes(2)
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
          nonResourceAttributes: {
            verb: 'get',
            path: '/openapi/v2'
          }
        })
      }
    ])
    expect(mockRequest.mock.calls[1]).toEqual([{
      ...pick(fixtures.kube, [':scheme', ':authority', 'authorization']),
      ':method': 'get',
      ':path': '/openapi/v2'
    }])

    expect(dereferenceStub).toBeCalledTimes(1)
    expect(res.body).toEqual(shootDefinitions)
  })
})
