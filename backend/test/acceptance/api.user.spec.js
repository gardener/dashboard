//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { pick } = require('lodash')
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
  describe('user', function () {
    const name = 'bar'
    const id = `${name}@example.org`
    const user = fixtures.auth.createUser({ id })
    const isAdmin = user.isAdmin()

    it('should return information about the user', async function () {
      mockRequest.mockImplementationOnce(fixtures.auth.reviewSelfSubjectAccess({ allowed: isAdmin }))

      const res = await agent
        .get('/api/user/privileges')
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
              group: '',
              name: undefined,
              resource: 'secrets',
              verb: 'get'
            }
          })
        }
      ])

      expect(res.body).toEqual({
        isAdmin
      })
    })

    it('should return the bearer token of the user', async function () {
      const bearer = await user.bearer
      const res = await agent
        .get('/api/user/token')
        .set('cookie', await user.cookie)
        .expect('content-type', /json/)
        .expect(200)

      expect(res.body.token).toBe(bearer)
    })

    it('should return selfsubjectrules for the user', async function () {
      const project = 'foo'
      const namespace = `garden-${project}`

      mockRequest.mockImplementationOnce(fixtures.auth.reviewSelfSubjectRules())

      const res = await agent
        .post('/api/user/subjectrules/')
        .set('cookie', await user.cookie)
        .send({ namespace })
        .expect('content-type', /json/)
        .expect(200)

      expect(mockRequest).toBeCalledTimes(1)
      expect(mockRequest.mock.calls[0]).toEqual([
        {
          ...pick(fixtures.kube, [':scheme', ':authority']),
          authorization: `Bearer ${await user.bearer}`,
          ':method': 'post',
          ':path': '/apis/authorization.k8s.io/v1/selfsubjectrulesreviews'
        },
        {
          apiVersion: 'authorization.k8s.io/v1',
          kind: 'SelfSubjectRulesReview',
          spec: { namespace }
        }
      ])

      expect(res.body).toHaveProperty('resourceRules')
      expect(res.body).toHaveProperty('nonResourceRules')
      expect(res.body).toHaveProperty('incomplete')
      expect(res.body.resourceRules.length).toBe(2)
    })

    it('should return the kubeconfig data the user', async function () {
      const { apiServerUrl, apiServerCaData, oidc } = fixtures.config.default

      const res = await agent
        .get('/api/user/kubeconfig')
        .set('cookie', await user.cookie)
        .expect('content-type', /json/)
        .expect(200)

      expect(res.body).toEqual({
        server: apiServerUrl,
        certificateAuthorityData: apiServerCaData,
        oidc: {
          issuerUrl: oidc.issuer,
          clientId: oidc.public.clientId,
          clientSecret: oidc.public.clientSecret,
          certificateAuthorityData: fixtures.helper.toBase64(oidc.ca),
          extraScopes: ['email', 'profile', 'groups']
        }
      })
    })
  })
})
