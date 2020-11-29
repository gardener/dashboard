// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0

'use strict'

const _ = require('lodash')
const { pick } = _
const { mockRequest } = require('@gardener-dashboard/request')
const fixtures = require('../../__fixtures__')

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

  describe('infrastructureSecrets', function () {
    const id = 'bar@example.org'
    const user = fixtures.auth.createUser({ id })

    const projectName = 'foo'
    const namespace = 'garden-foo'
    const name = 'foo-infra3'
    const secretBinding = fixtures.infrastructure.secretBindings.get(namespace, name)
    const secretRef = secretBinding.secretRef
    const cloudProfileName = secretBinding.metadata.labels['cloudprofile.garden.sapcloud.io/name']
    const cloudProfile = fixtures.cloudprofiles.get(cloudProfileName)
    const cloudProviderKind = cloudProfile.spec.type

    it('should return three infrastructure secrets', async function () {
      mockRequest.mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())
      mockRequest.mockImplementationOnce(fixtures.infrastructure.secrets.mocks.list())
      mockRequest.mockImplementationOnce(fixtures.infrastructure.secretBindings.mocks.list())

      const res = await agent
        .get(`/api/namespaces/${namespace}/infrastructure-secrets`)
        .set('cookie', await user.cookie)
        .expect('content-type', /json/)
        .expect(200)

      expect(mockRequest).toBeCalledTimes(3)
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

      expect(res.body).toHaveLength(3)
      _.forEach(res.body, secret => {
        expect(secret.metadata).toHaveProperty('hasCostObject', true)
        expect(secret.metadata).toHaveProperty('projectName')
        expect(secret.quotas).toHaveLength(2)
      })
    })

    it('should return no infrastructure secrets', async function () {
      const namespace = 'garden-baz'

      mockRequest.mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())
      mockRequest.mockImplementationOnce(fixtures.infrastructure.secrets.mocks.list())
      mockRequest.mockImplementationOnce(fixtures.infrastructure.secretBindings.mocks.list())

      const res = await agent
        .get(`/api/namespaces/${namespace}/infrastructure-secrets`)
        .set('cookie', await user.cookie)
        .expect('content-type', /json/)
        .expect(200)

      expect(mockRequest).toBeCalledTimes(3)
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

      expect(res.body).toHaveLength(0)
    })

    it('should create a infrastructure secret', async function () {
      const metadata = {
        name: 'new-infra1',
        namespace,
        cloudProfileName
      }
      const data = {
        key: 'myKey',
        secret: 'mySecret'
      }

      mockRequest.mockImplementationOnce(fixtures.infrastructure.secrets.mocks.create())
      mockRequest.mockImplementationOnce(fixtures.infrastructure.secretBindings.mocks.create())
      mockRequest.mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())

      const res = await agent
        .post(`/api/namespaces/${namespace}/infrastructure-secrets`)
        .set('cookie', await user.cookie)
        .send({ metadata, data })
        .expect('content-type', /json/)
        .expect(200)

      expect(mockRequest).toBeCalledTimes(3)
      expect(mockRequest.mock.calls[2]).toEqual([
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
              name: cloudProfileName,
              resource: 'cloudprofiles',
              verb: 'get'
            }
          })
        }
      ])

      expect(res.body.metadata).toEqual({
        ...metadata,
        cloudProviderKind,
        secretRef: {
          name: metadata.name,
          namespace
        },
        resourceVersion: '42',
        hasCostObject: true,
        projectName
      })
      expect(res.body.data).toHaveProperty('key')
      expect(res.body.data).toHaveProperty('secret')
    })

    it('should patch an own infrastructure secret', async function () {
      const data = {
        key: 'myKey',
        secret: 'mySecret'
      }

      mockRequest.mockImplementationOnce(fixtures.infrastructure.secretBindings.mocks.get())
      mockRequest.mockImplementationOnce(fixtures.infrastructure.secrets.mocks.patch())
      mockRequest.mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())

      const res = await agent
        .put(`/api/namespaces/${namespace}/infrastructure-secrets/${name}`)
        .set('cookie', await user.cookie)
        .send({ data })
        .expect('content-type', /json/)
        .expect(200)

      expect(mockRequest).toBeCalledTimes(3)
      expect(mockRequest.mock.calls[2]).toEqual([
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
              name: cloudProfileName,
              resource: 'cloudprofiles',
              verb: 'get'
            }
          })
        }
      ])

      expect(res.body.metadata).toEqual({
        name,
        namespace,
        cloudProfileName,
        cloudProviderKind,
        secretRef,
        resourceVersion: '43',
        hasCostObject: true,
        projectName
      })
      expect(res.body.data).toHaveProperty('key')
      expect(res.body.data).toHaveProperty('secret')
    })

    it('should not patch a shared infrastructure secret', async function () {
      const name = 'trial-infra1'
      const data = {}

      mockRequest.mockImplementationOnce(fixtures.infrastructure.secretBindings.mocks.get())

      const res = await agent
        .put(`/api/namespaces/${namespace}/infrastructure-secrets/${name}`)
        .set('cookie', await user.cookie)
        .send({ data })
        .expect('content-type', /json/)
        .expect(422)

      expect(mockRequest).toBeCalledTimes(1)

      expect(res.body).toHaveProperty('code', 422)
    })

    it('should delete an own infrastructure secret', async function () {
      mockRequest.mockImplementationOnce(fixtures.infrastructure.secretBindings.mocks.get())
      mockRequest.mockImplementationOnce(fixtures.shoots.mocks.list())
      mockRequest.mockImplementationOnce(fixtures.infrastructure.secretBindings.mocks.delete())
      mockRequest.mockImplementationOnce(fixtures.infrastructure.secrets.mocks.delete())

      const res = await agent
        .delete(`/api/namespaces/${namespace}/infrastructure-secrets/${name}`)
        .set('cookie', await user.cookie)
        .expect('content-type', /json/)
        .expect(200)

      expect(mockRequest).toBeCalledTimes(4)

      expect(res.body.metadata).toEqual({
        name,
        namespace,
        secretRef
      })
    })

    it('should not delete a shared infrastructure secret', async function () {
      const name = 'trial-infra1'

      mockRequest.mockImplementationOnce(fixtures.infrastructure.secretBindings.mocks.get())

      const res = await agent
        .delete(`/api/namespaces/${namespace}/infrastructure-secrets/${name}`)
        .set('cookie', await user.cookie)
        .expect('content-type', /json/)
        .expect(422)

      expect(mockRequest).toBeCalledTimes(1)

      expect(res.body).toHaveProperty('code', 422)
    })

    it('should not delete infrastructure secret if referenced by shoot', async function () {
      const name = 'foo-infra1'

      mockRequest.mockImplementationOnce(fixtures.infrastructure.secretBindings.mocks.get())
      mockRequest.mockImplementationOnce(fixtures.shoots.mocks.list())

      const res = await agent
        .delete(`/api/namespaces/${namespace}/infrastructure-secrets/${name}`)
        .set('cookie', await user.cookie)
        .expect('content-type', /json/)
        .expect(422)

      expect(mockRequest).toBeCalledTimes(2)

      expect(res.body).toHaveProperty('code', 422)
    })
  })
})
