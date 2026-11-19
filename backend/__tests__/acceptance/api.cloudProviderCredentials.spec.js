// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0

import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} from 'vitest'
import { find } from 'lodash-es'
import createError from 'http-errors'
import { Store } from '@gardener-dashboard/kube-client'
import request from '@gardener-dashboard/request'
import cache from '../../lib/cache/index.js'

const { mockRequest } = request

function createStore (items) {
  const store = new Store()
  store.replace(items)
  return store
}

function requestTargets () {
  return mockRequest.mock.calls.map(([headers]) => ({
    method: headers[':method'],
    path: headers[':path'],
  }))
}

describe('api', function () {
  let agent

  beforeAll(async () => {
    agent = await createAgent()

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

      expect(res.body.secrets).toHaveLength(2)
      expect(res.body.secrets[0].metadata.name).toBe('secret3')
      expect(res.body.secrets[1].metadata.name).toBe('dns-secret')
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
        .send({ method: 'createInfra', params })
        .expect('content-type', /json/)
        .expect(200)

      expect(mockRequest).toHaveBeenCalledTimes(2)
      expect(mockRequest.mock.calls).toMatchSnapshot()

      expect(res.body.binding.metadata.name).toBe(`new-${infraName}-credentialsbinding`)
      expect(res.body.secret.metadata.name).toBe(`new-${infraName}-secret`)
      expect(res.body).toMatchSnapshot()
    })

    it('should create a cloudProvider credentialsbinding without secret (secret already exists)', async function () {
      const newCredentialsBinding = {
        apiVersion: 'security.gardener.cloud/v1alpha1',
        kind: 'CredentialsBinding',
        metadata: {
          name: 'foo-infra3-secret2-secretbinding',
          namespace,
        },
        provider: {
          type: 'infra3',
        },
        credentialsRef: {
          apiVersion: 'v1',
          kind: 'Secret',
          namespace,
          name: 'secret2',
        },
      }

      mockRequest.mockImplementationOnce(fixtures.secretbindings.mocks.get())
      mockRequest.mockImplementationOnce(fixtures.credentialsbindings.mocks.create())

      const params = {
        binding: newCredentialsBinding,
      }

      const res = await agent
        .post('/api/cloudprovidercredentials')
        .set('cookie', await user.cookie)
        .send({ method: 'createInfra', params })
        .expect('content-type', /json/)
        .expect(200)

      expect(requestTargets()).toEqual([
        {
          method: 'get',
          path: '/apis/core.gardener.cloud/v1beta1/namespaces/garden-foo/secretbindings/foo-infra3-secret2-secretbinding',
        },
        {
          method: 'post',
          path: '/apis/security.gardener.cloud/v1alpha1/namespaces/garden-foo/credentialsbindings',
        },
      ])
      expect(res.body.binding.metadata.name).toBe('foo-infra3-secret2-secretbinding')
      expect(res.body.secret).toBeUndefined()
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
            'dashboard.gardener.cloud/dnsProviderType': 'aws-route53',
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
        .send({ method: 'createDns', params })
        .expect('content-type', /json/)
        .expect(200)

      expect(mockRequest).toHaveBeenCalledTimes(1)
      expect(mockRequest.mock.calls).toMatchSnapshot()

      expect(res.body.secret.metadata.name).toBe('new-dns-secret')
      expect(res.body).toMatchSnapshot()
    })

    it('should patch an own dns secret', async function () {
      const secret = {
        apiVersion: 'v1',
        kind: 'Secret',
        ...find(fixtures.secrets.list(namespace), { metadata: { name: 'secret1', namespace } }),
      }
      const params = {
        secret,
      }

      mockRequest.mockImplementationOnce(fixtures.secrets.mocks.patch())

      const res = await agent
        .post('/api/cloudprovidercredentials')
        .set('cookie', await user.cookie)
        .send({ method: 'patchDns', params })
        .expect('content-type', /json/)
        .expect(200)

      expect(mockRequest).toHaveBeenCalledTimes(1)
      expect(mockRequest.mock.calls).toMatchSnapshot()

      expect(res.body).toMatchSnapshot()
    })

    it('should re-create an own infra credential (secret) when patching an orphaned binding', async function () {
      const secret = {
        apiVersion: 'v1',
        kind: 'Secret',
        ...find(fixtures.secrets.list(namespace), { metadata: { name: 'secret1', namespace } }),
      }
      secret.metadata.name = 'secret4' // not existing secret
      const params = {
        secret,
      }

      mockRequest.mockImplementationOnce(fixtures.secrets.mocks.patch())
      mockRequest.mockImplementationOnce(fixtures.secrets.mocks.create())

      const res = await agent
        .post('/api/cloudprovidercredentials')
        .set('cookie', await user.cookie)
        .send({ method: 'patchInfra', params })
        .expect('content-type', /json/)
        .expect(200)

      expect(mockRequest).toHaveBeenCalledTimes(2)
      expect(mockRequest.mock.calls).toMatchSnapshot()

      expect(res.body).toMatchSnapshot()
    })

    it('should not re-create an infra credential when the update fails with a non-404 error', async function () {
      const secret = {
        apiVersion: 'v1',
        kind: 'Secret',
        ...find(fixtures.secrets.list(namespace), { metadata: { name: 'secret1', namespace } }),
      }
      secret.metadata.resourceVersion = '42'

      mockRequest.mockImplementationOnce(fixtures.secrets.mocks.patch())

      await agent
        .post('/api/cloudprovidercredentials')
        .set('cookie', await user.cookie)
        .send({ method: 'patchInfra', params: { secret } })
        .expect(409)

      expect(mockRequest).toHaveBeenCalledTimes(1)
    })

    it.each([
      ['SecretBinding', 'foo-infra3-secret2-secretbinding', 'secret2', 'Secret'],
      ['CredentialsBinding', 'foo-infra3-secret3-credentialsbinding', 'secret3', 'Secret'],
      ['CredentialsBinding', 'foo-wlid1', 'wl-foo-infra1', 'WorkloadIdentity'],
    ])('requests deletion of an unused %s %s and its credential', async (kind, name, credentialName, credentialKind) => {
      const params = { bindingKind: kind, bindingNamespace: namespace, bindingName: name }
      const binding = kind === 'SecretBinding'
        ? fixtures.secretbindings.get(namespace, name)
        : fixtures.credentialsbindings.get(namespace, name)
      if (kind === 'CredentialsBinding') {
        binding.credentialsRef.apiVersion = credentialKind === 'Secret'
          ? 'v1'
          : 'security.gardener.cloud/v1alpha1'
      }
      const credential = { kind: credentialKind, metadata: { namespace, name: credentialName } }
      const bindingApi = kind === 'SecretBinding' ? 'core.gardener.cloud/v1beta1' : 'security.gardener.cloud/v1alpha1'
      const bindingPath = `/apis/${bindingApi}/namespaces/${namespace}/${kind.toLowerCase()}s/${name}`
      const credentialPath = credentialKind === 'Secret'
        ? `/api/v1/namespaces/${namespace}/secrets/${credentialName}`
        : `/apis/security.gardener.cloud/v1alpha1/namespaces/${namespace}/workloadidentities/${credentialName}`

      mockRequest.mockResolvedValueOnce(binding)
      mockRequest.mockResolvedValueOnce(binding)
      mockRequest.mockResolvedValueOnce(credential)

      const res = await agent
        .post('/api/cloudprovidercredentials')
        .set('cookie', await user.cookie)
        .send({ method: 'removeInfra', params })
        .expect(200)

      expect(requestTargets()).toEqual([
        { method: 'get', path: bindingPath },
        { method: 'delete', path: bindingPath },
        { method: 'delete', path: credentialPath },
      ])
      expect(res.body).toMatchObject({
        credentialDeletionRequested: true,
        credentialMissing: false,
        credentialPreserved: false,
      })
    })

    it.each([
      {
        name: 'preserves the credential when binding-only deletion is requested',
        params: { preserveCredential: true },
        credentialError: undefined,
        expectedTargets: 2,
        expected: {
          credentialDeletionRequested: false,
          credentialMissing: false,
          credentialPreserved: true,
          credentialDeletionUnconfirmed: false,
        },
      },
      {
        name: 'reports an unconfirmed credential deletion as a partial success',
        params: {},
        credentialError: createError(500, 'apiserver unavailable'),
        expectedTargets: 3,
        expected: {
          credentialDeletionRequested: false,
          credentialMissing: false,
          credentialPreserved: false,
          credentialDeletionUnconfirmed: true,
          credentialDeletionError: 'apiserver unavailable',
        },
      },
    ])('$name', async ({ params: overrides, credentialError, expectedTargets, expected }) => {
      const bindingName = 'foo-infra3-secret3-credentialsbinding'
      const credentialName = 'secret3'
      const binding = fixtures.credentialsbindings.get(namespace, bindingName)
      binding.credentialsRef.apiVersion = 'v1'
      const bindingPath = `/apis/security.gardener.cloud/v1alpha1/namespaces/${namespace}/credentialsbindings/${bindingName}`
      const credentialPath = `/api/v1/namespaces/${namespace}/secrets/${credentialName}`

      mockRequest.mockResolvedValueOnce(binding)
      mockRequest.mockResolvedValueOnce(binding)
      if (credentialError) {
        mockRequest.mockRejectedValueOnce(credentialError)
      }

      const res = await agent
        .post('/api/cloudprovidercredentials')
        .set('cookie', await user.cookie)
        .send({
          method: 'removeInfra',
          params: {
            bindingKind: 'CredentialsBinding',
            bindingNamespace: namespace,
            bindingName,
            ...overrides,
          },
        })
        .expect(200)

      expect(requestTargets()).toEqual([
        { method: 'get', path: bindingPath },
        { method: 'delete', path: bindingPath },
        ...(expectedTargets === 3
          ? [{ method: 'delete', path: credentialPath }]
          : []),
      ])
      expect(res.body).toMatchObject({
        credentialRef: {
          apiVersion: 'v1',
          kind: 'Secret',
          namespace,
          name: credentialName,
        },
        ...expected,
      })
    })

    it('deletes a DNS Secret and checks for old DNS bindings', async () => {
      const params = { credentialKind: 'Secret', credentialNamespace: namespace, credentialName: 'dns-credential' }
      const credentialPath = `/api/v1/namespaces/${namespace}/secrets/dns-credential`
      mockRequest.mockResolvedValueOnce({})
      mockRequest.mockResolvedValueOnce({ items: [] })
      mockRequest.mockResolvedValueOnce({ items: [] })

      await agent
        .post('/api/cloudprovidercredentials')
        .set('cookie', await user.cookie)
        .send({ method: 'removeDns', params })
        .expect(200)

      expect(requestTargets()).toEqual([
        { method: 'delete', path: credentialPath },
        { method: 'get', path: `/apis/core.gardener.cloud/v1beta1/namespaces/${namespace}/secretbindings` },
        { method: 'get', path: `/apis/security.gardener.cloud/v1alpha1/namespaces/${namespace}/credentialsbindings` },
      ])
    })

    it('deletes legacy DNS bindings that reference the deleted Secret', async () => {
      const credentialName = 'dns-credential'
      const secretBindingName = 'legacy-dns-secretbinding'
      const credentialsBindingName = 'legacy-dns-credentialsbinding'
      const credentialPath = `/api/v1/namespaces/${namespace}/secrets/${credentialName}`
      const secretBindingPath = `/apis/core.gardener.cloud/v1beta1/namespaces/${namespace}/secretbindings/${secretBindingName}`
      const credentialsBindingPath = `/apis/security.gardener.cloud/v1alpha1/namespaces/${namespace}/credentialsbindings/${credentialsBindingName}`
      const secretBinding = {
        kind: 'SecretBinding',
        metadata: { namespace, name: secretBindingName },
        secretRef: { namespace, name: credentialName },
      }
      const credentialsBinding = {
        kind: 'CredentialsBinding',
        metadata: { namespace, name: credentialsBindingName },
        credentialsRef: { apiVersion: 'v1', kind: 'Secret', namespace, name: credentialName },
      }

      mockRequest.mockResolvedValueOnce({})
      mockRequest.mockResolvedValueOnce({ items: [secretBinding] })
      mockRequest.mockResolvedValueOnce({ items: [credentialsBinding] })
      mockRequest.mockResolvedValueOnce({})
      mockRequest.mockResolvedValueOnce({})

      await agent
        .post('/api/cloudprovidercredentials')
        .set('cookie', await user.cookie)
        .send({ method: 'removeDns', params: { credentialKind: 'Secret', credentialNamespace: namespace, credentialName } })
        .expect(200)

      expect(requestTargets()).toEqual([
        { method: 'delete', path: credentialPath },
        { method: 'get', path: `/apis/core.gardener.cloud/v1beta1/namespaces/${namespace}/secretbindings` },
        { method: 'get', path: `/apis/security.gardener.cloud/v1alpha1/namespaces/${namespace}/credentialsbindings` },
        { method: 'delete', path: secretBindingPath },
        { method: 'delete', path: credentialsBindingPath },
      ])
    })

    it('deletes a pre-existing DNS WorkloadIdentity request without reference reads', async () => {
      const credentialPath = `/apis/security.gardener.cloud/v1alpha1/namespaces/${namespace}/workloadidentities/dns-credential`
      mockRequest.mockResolvedValueOnce({})

      await agent
        .post('/api/cloudprovidercredentials')
        .set('cookie', await user.cookie)
        .send({ method: 'removeDns', params: { credentialKind: 'WorkloadIdentity', credentialNamespace: namespace, credentialName: 'dns-credential' } })
        .expect(200)

      expect(requestTargets()).toEqual([
        { method: 'delete', path: credentialPath },
      ])
    })

    it('propagates Gardener admission errors when deleting a referenced DNS Secret', async () => {
      const credentialPath = `/api/v1/namespaces/${namespace}/secrets/secret1`
      mockRequest.mockRejectedValueOnce(createError(403, 'Secret is still referenced'))

      await agent
        .post('/api/cloudprovidercredentials')
        .set('cookie', await user.cookie)
        .send({ method: 'removeDns', params: { credentialKind: 'Secret', credentialNamespace: namespace, credentialName: 'secret1' } })
        .expect(403)

      expect(requestTargets()).toEqual([
        { method: 'delete', path: credentialPath },
      ])
    })
  })
})
