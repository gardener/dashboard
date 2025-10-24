// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0

'use strict'

const { mockRequest } = require('@gardener-dashboard/request')
const { Store } = require('@gardener-dashboard/kube-client')
const cache = require('../../dist/lib/cache')
const _ = require('lodash')

function createStore (items) {
  const store = new Store()
  store.replace(items)
  return store
}

describe('api', function () {
  let agent

  beforeAll(() => {
    agent = createAgent()

    cache.initialize({
      shoots: {
        store: createStore(fixtures.shoots.list()),
      },
    })
  })

  afterAll(() => {
    cache.cache.resetTicketCache()
    return agent.close()
  })

  beforeEach(() => {
    mockRequest.mockReset()
  })

  describe('cloudproviderCredentials', function () {
    const namespace = 'garden-foo'
    const infraName = 'foo-infra3'
    // project
    const project = fixtures.projects.getByNamespace(namespace)
    // user
    const id = project.spec.owner.name
    const user = fixtures.auth.createUser({ id })

    it('should return secretbindings, credentialsbinding, secrets and workloadidentities for given namespace', async function () {
      mockRequest.mockImplementationOnce(fixtures.secretbindings.mocks.list())
      mockRequest.mockImplementationOnce(fixtures.credentialsbindings.mocks.list())
      mockRequest.mockImplementationOnce(fixtures.secrets.mocks.list())
      mockRequest.mockImplementationOnce(fixtures.workloadidentities.mocks.list())

      const params = {
        namespace,
      }

      const res = await agent
        .post('/api/cloudprovidercredentials')
        .set('cookie', await user.cookie)
        .send({ method: 'list', params })
        .expect('content-type', /json/)
        .expect(200)

      expect(mockRequest).toHaveBeenCalledTimes(4)
      expect(mockRequest.mock.calls).toMatchSnapshot()

      expect(res.body.secrets).toHaveLength(1)
      expect(res.body.secrets[0].metadata.name).toBe('dns-secret')
      expect(Array.isArray(res.body.workloadIdentities)).toBe(true)
      expect(res.body.secretBindings).toHaveLength(3)
      expect(res.body).toMatchSnapshot()
    })

    it('should return no cloudProvider credentials', async function () {
      mockRequest.mockImplementationOnce(fixtures.secretbindings.mocks.list())
      mockRequest.mockImplementationOnce(fixtures.credentialsbindings.mocks.list())
      mockRequest.mockImplementationOnce(fixtures.secrets.mocks.list())
      mockRequest.mockImplementationOnce(fixtures.workloadidentities.mocks.list())

      const namespace = 'garden-baz'
      const params = {
        namespace,
      }

      const res = await agent
        .post('/api/cloudprovidercredentials')
        .set('cookie', await user.cookie)
        .send({ method: 'list', params })
        .expect('content-type', /json/)
        .expect(200)

      expect(mockRequest).toHaveBeenCalledTimes(4)
      expect(res.body).toEqual({
        credentialsBindings: [],
        quotas: [],
        secretBindings: [],
        secrets: [],
        workloadIdentities: [],
      })
    })

    it('should create a cloudProvider credentialsbinding and secret', async function () {
      const newCredentialsBinding = {
        apiVersion: 'security.gardener.cloud/v1alpha1',
        kind: 'CredentialsBinding',
        metadata: {
          name: `new-${infraName}-credentialsbinding`,
          namespace,
        },
        provider: {
          type: infraName,
        },
        credentialsRef: {
          apiVersion: 'v1',
          kind: 'Secret',
          namespace,
          name: `new-${infraName}-secret`,
        },
      }

      const newSecret = {
        apiVersion: 'v1',
        kind: 'Secret',
        type: 'Opaque',
        metadata: {
          name: `new-${infraName}-secret`,
          namespace,
        },
        data: {
          key: 'bmV3LWRhdGE=',
        },
      }

      mockRequest.mockImplementationOnce(fixtures.secrets.mocks.create())
      mockRequest.mockImplementationOnce(fixtures.credentialsbindings.mocks.create())

      const params = {
        binding: newCredentialsBinding,
        secret: newSecret,
      }

      const res = await agent
        .post('/api/cloudprovidercredentials')
        .set('cookie', await user.cookie)
        .send({ method: 'create-infra', params })
        .expect('content-type', /json/)
        .expect(200)

      expect(mockRequest).toHaveBeenCalledTimes(2)
      expect(mockRequest.mock.calls).toMatchSnapshot()

      expect(res.body.binding.metadata.name).toBe(`new-${infraName}-credentialsbinding`)
      expect(res.body.secret.metadata.name).toBe(`new-${infraName}-secret`)
      expect(res.body).toMatchSnapshot()
    })

    it('should create a cloudProvider dns secret (no binding)', async function () {
      const newSecret = {
        apiVersion: 'v1',
        kind: 'Secret',
        type: 'Opaque',
        metadata: {
          name: 'new-dns-secret',
          namespace,
          labels: {
            'provider.shoot.gardener.cloud/aws-route53': 'true',
          },
        },
        data: {
          key: 'bmV3LWRhdGE=',
        },
      }

      mockRequest.mockImplementationOnce(fixtures.secrets.mocks.create())

      const params = {
        secret: newSecret,
      }

      const res = await agent
        .post('/api/cloudprovidercredentials')
        .set('cookie', await user.cookie)
        .send({ method: 'create-dns', params })
        .expect('content-type', /json/)
        .expect(200)

      expect(mockRequest).toHaveBeenCalledTimes(1)
      expect(mockRequest.mock.calls).toMatchSnapshot()

      expect(res.body.secret.metadata.name).toBe('new-dns-secret')
      expect(res.body).toMatchSnapshot()
    })

    it('should patch an own cloudProvider credential (secret)', async function () {
      const secret = _.find(fixtures.secrets.list(namespace), { metadata: { name: 'secret1', namespace } })
      const params = {
        secret,
      }

      mockRequest.mockImplementationOnce(fixtures.secrets.mocks.patch())

      const res = await agent
        .post('/api/cloudprovidercredentials')
        .set('cookie', await user.cookie)
        .send({ method: 'patch', params })
        .expect('content-type', /json/)
        .expect(200)

      expect(mockRequest).toHaveBeenCalledTimes(1)
      expect(mockRequest.mock.calls).toMatchSnapshot()

      expect(res.body).toMatchSnapshot()
    })

    it('should re-create an own cloudProvider credential (secret) when patching an orphaned binding', async function () {
      const secret = _.find(fixtures.secrets.list(namespace), { metadata: { name: 'secret1', namespace } })
      secret.metadata.name = 'secret4' // not existing secret
      const params = {
        secret,
      }

      mockRequest.mockImplementationOnce(fixtures.secrets.mocks.patch())
      mockRequest.mockImplementationOnce(fixtures.secrets.mocks.create())

      const res = await agent
        .post('/api/cloudprovidercredentials')
        .set('cookie', await user.cookie)
        .send({ method: 'patch', params })
        .expect('content-type', /json/)
        .expect(200)

      expect(mockRequest).toHaveBeenCalledTimes(2)
      expect(mockRequest.mock.calls).toMatchSnapshot()

      expect(res.body).toMatchSnapshot()
    })

    it('should delete an own cloudProvider credential (secretbinding)', async function () {
      const params = {
        bindingKind: 'SecretBinding',
        bindingNamespace: 'garden-foo',
        bindingName: 'foo-infra3-secret2-secretbinding',
      }
      mockRequest.mockImplementationOnce(fixtures.secretbindings.mocks.get())
      mockRequest.mockImplementationOnce(fixtures.secrets.mocks.delete())
      mockRequest.mockImplementationOnce(fixtures.secretbindings.mocks.delete())

      const res = await agent
        .post('/api/cloudprovidercredentials')
        .set('cookie', await user.cookie)
        .send({ method: 'remove-infra', params })
        .expect(200)

      expect(mockRequest).toHaveBeenCalledTimes(3)
      expect(mockRequest.mock.calls).toMatchSnapshot()

      expect(res.body).toMatchSnapshot()
    })

    it('should delete an own cloudProvider credential (secret / credentialsbinding)', async function () {
      const params = {
        bindingKind: 'CredentialsBinding',
        bindingNamespace: 'garden-foo',
        bindingName: 'foo-infra3-secret3-credentialsbinding',
      }
      mockRequest.mockImplementationOnce(fixtures.credentialsbindings.mocks.get())
      mockRequest.mockImplementationOnce(fixtures.secrets.mocks.delete())
      mockRequest.mockImplementationOnce(fixtures.credentialsbindings.mocks.delete())

      const res = await agent
        .post('/api/cloudprovidercredentials')
        .set('cookie', await user.cookie)
        .send({ method: 'remove-infra', params })
        .expect(200)

      expect(mockRequest).toHaveBeenCalledTimes(3)
      expect(mockRequest.mock.calls).toMatchSnapshot()

      expect(res.body).toMatchSnapshot()
    })

    it('should delete an own cloudProvider credential (workloadidentity / credentialsbinding)', async function () {
      const params = {
        bindingKind: 'CredentialsBinding',
        bindingNamespace: 'garden-foo',
        bindingName: 'foo-wlid1',
      }
      mockRequest.mockImplementationOnce(fixtures.credentialsbindings.mocks.get())
      mockRequest.mockImplementationOnce(fixtures.workloadidentities.mocks.delete())
      mockRequest.mockImplementationOnce(fixtures.credentialsbindings.mocks.delete())

      const res = await agent
        .post('/api/cloudprovidercredentials')
        .set('cookie', await user.cookie)
        .send({ method: 'remove-infra', params })
        .expect(200)

      expect(mockRequest).toHaveBeenCalledTimes(3)
      expect(mockRequest.mock.calls).toMatchSnapshot()

      expect(res.body).toMatchSnapshot()
    })

    it('should delete a cloudProvider DNS credential (secret / no binding)', async function () {
      const params = {
        credentialKind: 'Secret',
        credentialNamespace: namespace,
        credentialName: 'dns-secret',
      }
      mockRequest.mockImplementationOnce(fixtures.secrets.mocks.delete())

      const res = await agent
        .post('/api/cloudprovidercredentials')
        .set('cookie', await user.cookie)
        .send({ method: 'remove-dns', params })
        .expect(200)

      expect(mockRequest).toHaveBeenCalledTimes(1)
      expect(mockRequest.mock.calls).toMatchSnapshot()

      expect(res.body).toMatchSnapshot()
    })

    it('should delete a cloudProvider DNS credential (workloadidentity / no binding)', async function () {
      const params = {
        credentialKind: 'WorkloadIdentity',
        credentialNamespace: namespace,
        credentialName: 'dns-wlid',
      }
      mockRequest.mockImplementationOnce(fixtures.workloadidentities.mocks.delete())

      const res = await agent
        .post('/api/cloudprovidercredentials')
        .set('cookie', await user.cookie)
        .send({ method: 'remove-dns', params })
        .expect(200)

      expect(mockRequest).toHaveBeenCalledTimes(1)
      expect(mockRequest.mock.calls).toMatchSnapshot()

      expect(res.body).toMatchSnapshot()
    })
  })
})
