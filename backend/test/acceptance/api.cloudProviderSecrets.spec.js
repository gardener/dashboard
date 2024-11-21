// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0

'use strict'

const { mockRequest } = require('@gardener-dashboard/request')
const { Store } = require('@gardener-dashboard/kube-client')
const cache = require('../../lib/cache')

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

  describe('cloudProviderSecrets', function () {
    const namespace = 'garden-foo'
    const infraName = 'foo-infra3'
    const dnsName = 'foo-dns1'
    // project
    const project = fixtures.projects.getByNamespace(namespace)
    // user
    const id = project.spec.owner.name
    const user = fixtures.auth.createUser({ id })

    it('should return three cloudProvider secrets', async function () {
      mockRequest.mockImplementationOnce(fixtures.secrets.mocks.list())
      mockRequest.mockImplementationOnce(fixtures.secretbindings.mocks.list())

      const res = await agent
        .get(`/api/namespaces/${namespace}/cloudprovidersecrets`)
        .set('cookie', await user.cookie)
        .expect('content-type', /json/)
        .expect(200)

      expect(mockRequest).toHaveBeenCalledTimes(2)
      expect(mockRequest.mock.calls).toMatchSnapshot()

      expect(res.body).toMatchSnapshot()
    })

    it('should return no cloudProvider secrets', async function () {
      const namespace = 'garden-baz'

      mockRequest.mockImplementationOnce(fixtures.secrets.mocks.list())
      mockRequest.mockImplementationOnce(fixtures.secretbindings.mocks.list())

      const res = await agent
        .get(`/api/namespaces/${namespace}/cloudprovidersecrets`)
        .set('cookie', await user.cookie)
        .expect('content-type', /json/)
        .expect(200)

      expect(mockRequest).toHaveBeenCalledTimes(2)
      expect(mockRequest.mock.calls).toMatchSnapshot()

      expect(res.body).toMatchSnapshot()
    })

    it('should create a cloudProvider infrastructure secret', async function () {
      const metadata = {
        name: 'new-infra1',
        provider: {
          type: infraName,
        },
        providerType: 'infra1',
      }
      const data = {
        key: 'myKey',
        secret: 'mySecret',
      }

      mockRequest.mockImplementationOnce(fixtures.secrets.mocks.create())
      mockRequest.mockImplementationOnce(fixtures.secretbindings.mocks.create())

      const res = await agent
        .post(`/api/namespaces/${namespace}/cloudprovidersecrets`)
        .set('cookie', await user.cookie)
        .send({ metadata, data })
        .expect('content-type', /json/)
        .expect(200)

      expect(mockRequest).toHaveBeenCalledTimes(2)
      expect(mockRequest.mock.calls).toMatchSnapshot()

      expect(res.body).toMatchSnapshot()
    })

    it('should create a cloudProvider dns secret', async function () {
      const metadata = {
        name: 'new-dns1',
        provider: {
          type: dnsName,
        },
      }
      const data = {
        key: 'myKey',
        secret: 'mySecret',
      }

      mockRequest.mockImplementationOnce(fixtures.secrets.mocks.create())
      mockRequest.mockImplementationOnce(fixtures.secretbindings.mocks.create())

      const res = await agent
        .post(`/api/namespaces/${namespace}/cloudprovidersecrets`)
        .set('cookie', await user.cookie)
        .send({ metadata, data })
        .expect('content-type', /json/)
        .expect(200)

      expect(mockRequest).toHaveBeenCalledTimes(2)
      expect(mockRequest.mock.calls).toMatchSnapshot()

      expect(res.body).toMatchSnapshot()
    })

    it('should patch an own cloudProvider secret', async function () {
      const data = {
        key: 'myKey',
        secret: 'mySecret',
      }

      mockRequest.mockImplementationOnce(fixtures.secretbindings.mocks.get())
      mockRequest.mockImplementationOnce(fixtures.secrets.mocks.patch())

      const res = await agent
        .put(`/api/namespaces/${namespace}/cloudprovidersecrets/${infraName}`)
        .set('cookie', await user.cookie)
        .send({ data })
        .expect('content-type', /json/)
        .expect(200)

      expect(mockRequest).toHaveBeenCalledTimes(2)
      expect(mockRequest.mock.calls).toMatchSnapshot()

      expect(res.body).toMatchSnapshot()
    })

    it('should not patch a shared cloudProvider secret', async function () {
      const name = 'trial-infra1'

      mockRequest.mockImplementationOnce(fixtures.secretbindings.mocks.get())

      const res = await agent
        .put(`/api/namespaces/${namespace}/cloudprovidersecrets/${name}`)
        .set('cookie', await user.cookie)
        .send({ data: {} })
        .expect('content-type', /json/)
        .expect(422)

      expect(mockRequest).toHaveBeenCalledTimes(1)
      expect(mockRequest.mock.calls).toMatchSnapshot()

      expect(res.body).toMatchSnapshot({
        details: expect.any(Object),
      })
    })

    it('should delete an own cloudProvider secret', async function () {
      mockRequest.mockImplementationOnce(fixtures.secretbindings.mocks.get())
      mockRequest.mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())
      mockRequest.mockImplementationOnce(fixtures.secretbindings.mocks.delete())
      mockRequest.mockImplementationOnce(fixtures.secrets.mocks.delete())

      const res = await agent
        .delete(`/api/namespaces/${namespace}/cloudprovidersecrets/${infraName}`)
        .set('cookie', await user.cookie)
        .expect('content-type', /json/)
        .expect(200)

      expect(mockRequest).toHaveBeenCalledTimes(4)
      expect(mockRequest.mock.calls).toMatchSnapshot()

      expect(res.body).toMatchSnapshot()
    })

    it('should not delete a shared cloudProvider secret', async function () {
      const name = 'trial-infra1'

      mockRequest.mockImplementationOnce(fixtures.secretbindings.mocks.get())

      const res = await agent
        .delete(`/api/namespaces/${namespace}/cloudprovidersecrets/${name}`)
        .set('cookie', await user.cookie)
        .expect('content-type', /json/)
        .expect(422)

      expect(mockRequest).toHaveBeenCalledTimes(1)
      expect(mockRequest.mock.calls).toMatchSnapshot()

      expect(res.body).toMatchSnapshot({
        details: expect.any(Object),
      })
    })

    it('should not delete cloudProvider secret if referenced by shoot', async function () {
      const name = 'foo-infra1'

      mockRequest.mockImplementationOnce(fixtures.secretbindings.mocks.get())
      mockRequest.mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())

      const res = await agent
        .delete(`/api/namespaces/${namespace}/cloudprovidersecrets/${name}`)
        .set('cookie', await user.cookie)
        .expect('content-type', /json/)
        .expect(422)

      expect(mockRequest).toHaveBeenCalledTimes(2)
      expect(mockRequest.mock.calls).toMatchSnapshot()

      expect(res.body).toMatchSnapshot({
        details: expect.any(Object),
      })
    })
  })
})
