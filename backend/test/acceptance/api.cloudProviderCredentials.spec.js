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

    it('should return three cloudProvider credentials', async function () {
      mockRequest.mockImplementationOnce(fixtures.secretbindings.mocks.list())
      mockRequest.mockImplementationOnce(fixtures.secrets.mocks.list())

      const params = {
        secretBindingNamespace: namespace,
      }

      const res = await agent
        .post('/api/cloudprovidercredentials')
        .set('cookie', await user.cookie)
        .send({ method: 'list', params })
        .expect('content-type', /json/)
        .expect(200)

      expect(mockRequest).toHaveBeenCalledTimes(2)
      expect(mockRequest.mock.calls).toMatchSnapshot()

      expect(res.body).toMatchSnapshot()
    })

    it('should return no cloudProvider credentials', async function () {
      mockRequest.mockImplementationOnce(fixtures.secretbindings.mocks.list())
      mockRequest.mockImplementationOnce(fixtures.secrets.mocks.list())

      const namespace = 'garden-baz'
      const params = {
        secretBindingNamespace: namespace,
      }

      const res = await agent
        .post('/api/cloudprovidercredentials')
        .set('cookie', await user.cookie)
        .send({ method: 'list', params })
        .expect('content-type', /json/)
        .expect(200)

      expect(mockRequest).toHaveBeenCalledTimes(2)
      expect(mockRequest.mock.calls).toMatchSnapshot()

      expect(res.body).toMatchSnapshot()
    })

    it('should create a cloudProvider infrastructure secret', async function () {
      const newSecretBinding = {
        apiVersion: 'core.gardener.cloud/v1alpha1',
        kind: 'SecretBinding',
        metadata: {
          name: `new-${infraName}-secretbinding`,
          namespace,
        },
        provider: {
          type: infraName,
        },
        secretRef: {
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
      mockRequest.mockImplementationOnce(fixtures.secretbindings.mocks.create())

      const params = {
        secretBinding: newSecretBinding,
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

    it('should patch an own cloudProvider credential', async function () {
      const secretBinding = _.find(fixtures.secretbindings.list(namespace), { metadata: { name: 'foo-infra1', namespace } })
      const secret = _.find(fixtures.secrets.list(namespace), { metadata: secretBinding.secretRef })
      const params = {
        secretBinding,
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

    it('should not patch a shared cloudProvider credential', async function () {
      const secretBinding = _.find(fixtures.secretbindings.list(namespace), { metadata: { name: 'trial-infra1' } })
      const secret = _.find(fixtures.secrets.list('garden-trial'), { metadata: { name: 'trial-secret' } })

      const params = {
        secretBinding,
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

    it('should delete an own cloudProvider credential', async function () {
      const params = {
        secretBindingNamespace: namespace,
        secretBindingName: 'foo-infra1',
      }
      mockRequest.mockImplementationOnce(fixtures.secretbindings.mocks.get())
      mockRequest.mockImplementationOnce(fixtures.secretbindings.mocks.delete())
      mockRequest.mockImplementationOnce(fixtures.secrets.mocks.delete())

      const res = await agent
        .post('/api/cloudprovidercredentials')
        .set('cookie', await user.cookie)
        .send({ method: 'remove', params })
        .expect(200)

      expect(mockRequest).toHaveBeenCalledTimes(3)
      expect(mockRequest.mock.calls).toMatchSnapshot()

      expect(res.body).toMatchSnapshot()
    })

    it('should not delete a shared cloudProvider credential', async function () {
      const params = {
        secretBindingNamespace: namespace,
        secretBindingName: 'trial-infra1',
      }
      mockRequest.mockImplementationOnce(fixtures.secretbindings.mocks.get())

      const res = await agent
        .post('/api/cloudprovidercredentials')
        .set('cookie', await user.cookie)
        .send({ method: 'remove', params })
        .expect(422)

      expect(mockRequest).toHaveBeenCalledTimes(1)
      expect(mockRequest.mock.calls).toMatchSnapshot()

      expect(res.body).toMatchSnapshot({
        details: expect.any(Object),
      })
    })
  })
})
