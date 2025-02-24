// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0

'use strict'

const { mockRequest } = require('@gardener-dashboard/request')
const { Store } = require('@gardener-dashboard/kube-client')
const cache = require('../../lib/cache')
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
      mockRequest.mockImplementationOnce(fixtures.secrets.mocks.list())
      mockRequest.mockImplementationOnce(fixtures.workloadidentities.mocks.list())

      const params = {
        bindingNamespace: namespace,
      }

      const res = await agent
        .post('/api/cloudprovidercredentials')
        .set('cookie', await user.cookie)
        .send({ method: 'list', params })
        .expect('content-type', /json/)
        .expect(200)

      expect(mockRequest).toHaveBeenCalledTimes(5)
      expect(mockRequest.mock.calls).toMatchSnapshot()

      expect(res.body).toMatchSnapshot()
    })

    it('should return no cloudProvider credentials', async function () {
      mockRequest.mockImplementationOnce(fixtures.secretbindings.mocks.list())
      mockRequest.mockImplementationOnce(fixtures.credentialsbindings.mocks.list())
      mockRequest.mockImplementationOnce(fixtures.secrets.mocks.list())
      mockRequest.mockImplementationOnce(fixtures.secrets.mocks.list())
      mockRequest.mockImplementationOnce(fixtures.workloadidentities.mocks.list())

      const namespace = 'garden-baz'
      const params = {
        bindingNamespace: namespace,
      }

      const res = await agent
        .post('/api/cloudprovidercredentials')
        .set('cookie', await user.cookie)
        .send({ method: 'list', params })
        .expect('content-type', /json/)
        .expect(200)

      expect(mockRequest).toHaveBeenCalledTimes(5)
      expect(mockRequest.mock.calls).toMatchSnapshot()

      expect(res.body).toMatchSnapshot()
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
        .send({ method: 'create', params })
        .expect('content-type', /json/)
        .expect(200)

      expect(mockRequest).toHaveBeenCalledTimes(2)
      expect(mockRequest.mock.calls).toMatchSnapshot()

      expect(res.body).toMatchSnapshot()
    })

    it('should patch an own cloudProvider credential (secretbinding)', async function () {
      const secretBinding = _.find(fixtures.secretbindings.list(namespace), { metadata: { name: 'foo-infra1-secret1-secretbinding', namespace } })
      const secret = _.find(fixtures.secrets.list(namespace), { metadata: secretBinding.secretRef })
      const params = {
        binding: secretBinding,
        secret,
      }

      mockRequest.mockImplementationOnce(fixtures.secretbindings.mocks.get())
      mockRequest.mockImplementationOnce(fixtures.secrets.mocks.patch())

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

    it('should patch an own cloudProvider credential (credentialsbinding)', async function () {
      const credentialsBinding = _.find(fixtures.credentialsbindings.list(namespace), { metadata: { name: 'foo-infra1-secret1-credentialsbinding', namespace } })
      const secretMetadata = _.pick(credentialsBinding.credentialsRef, ['name', 'namespace'])
      const secret = _.find(fixtures.secrets.list(namespace), { metadata: secretMetadata })
      const params = {
        binding: credentialsBinding,
        secret,
      }

      mockRequest.mockImplementationOnce(fixtures.credentialsbindings.mocks.get())
      mockRequest.mockImplementationOnce(fixtures.secrets.mocks.patch())

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

    it('should not patch a shared cloudProvider credential (secretbinding)', async function () {
      const secretBinding = _.find(fixtures.secretbindings.list(namespace), { metadata: { name: 'trial-infra1' } })
      const secret = _.find(fixtures.secrets.list('garden-trial'), { metadata: { name: 'trial-secret' } })

      const params = {
        binding: secretBinding,
        secret,
      }

      mockRequest.mockImplementationOnce(fixtures.secretbindings.mocks.get())

      const res = await agent
        .post('/api/cloudprovidercredentials')
        .set('cookie', await user.cookie)
        .send({ method: 'patch', params })
        .expect('content-type', /json/)
        .expect(422)

      expect(mockRequest).toHaveBeenCalledTimes(1)
      expect(mockRequest.mock.calls).toMatchSnapshot()

      expect(res.body).toMatchSnapshot()
    })

    it('should not patch a shared cloudProvider credential (credentialsbinding)', async function () {
      const credentialsBinding = _.find(fixtures.credentialsbindings.list(namespace), { metadata: { name: 'trial-infra1' } })
      const secret = _.find(fixtures.secrets.list('garden-trial'), { metadata: { name: 'trial-secret' } })

      const params = {
        binding: credentialsBinding,
        secret,
      }

      mockRequest.mockImplementationOnce(fixtures.credentialsbindings.mocks.get())

      const res = await agent
        .post('/api/cloudprovidercredentials')
        .set('cookie', await user.cookie)
        .send({ method: 'patch', params })
        .expect('content-type', /json/)
        .expect(422)

      expect(mockRequest).toHaveBeenCalledTimes(1)
      expect(mockRequest.mock.calls).toMatchSnapshot()

      expect(res.body).toMatchSnapshot()
    })

    it('should delete an own cloudProvider credential (secretbinding)', async function () {
      const params = {
        namespace: 'garden-foo',
        secretBindingName: 'foo-infra3-secret2-secretbinding',
        secretName: 'secret2',
      }
      mockRequest.mockImplementationOnce(fixtures.secretbindings.mocks.delete())
      mockRequest.mockImplementationOnce(fixtures.secrets.mocks.delete())

      const res = await agent
        .post('/api/cloudprovidercredentials')
        .set('cookie', await user.cookie)
        .send({ method: 'remove', params })
        .expect(200)

      expect(mockRequest).toHaveBeenCalledTimes(2)
      expect(mockRequest.mock.calls).toMatchSnapshot()

      expect(res.body).toMatchSnapshot()
    })

    it('should delete an own cloudProvider credential (credentialsbinding)', async function () {
      const params = {
        namespace: 'garden-foo',
        credentialsBindingName: 'foo-infra3-secret3-credentialsbinding',
        secretName: 'secret3',
      }
      mockRequest.mockImplementationOnce(fixtures.credentialsbindings.mocks.delete())
      mockRequest.mockImplementationOnce(fixtures.secrets.mocks.delete())

      const res = await agent
        .post('/api/cloudprovidercredentials')
        .set('cookie', await user.cookie)
        .send({ method: 'remove', params })
        .expect(200)

      expect(mockRequest).toHaveBeenCalledTimes(2)
      expect(mockRequest.mock.calls).toMatchSnapshot()

      expect(res.body).toMatchSnapshot()
    })
  })
})
