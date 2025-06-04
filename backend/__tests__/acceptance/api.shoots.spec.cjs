//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { mockRequest } = require('@gardener-dashboard/request')
const { Store } = require('@gardener-dashboard/kube-client')
const kubeconfig = require('@gardener-dashboard/kube-config')
const yaml = require('js-yaml')
const logger = require('../../dist/lib/logger')
const cache = require('../../dist/lib/cache')

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
      projects: {
        store: createStore(fixtures.projects.list()),
      },
      shoots: {
        store: createStore(fixtures.shoots.list().map(item => {
          const status = item.metadata.uid !== 3
            ? 'healthy'
            : 'unhealthy'
          item.metadata.labels = {
            ...item.metadata.labels,
            'shoot.gardener.cloud/status': status,
          }
          return item
        })),
      },
    })
  })

  afterAll(() => {
    cache.cache.resetTicketCache()
    return agent.close()
  })

  afterEach(() => {
    mockRequest.mockReset()
    kubeconfig.cleanKubeconfig.mockClear()
    logger.info.mockClear()
  })

  describe('shoots', function () {
    const name = 'barShoot'
    const namespace = 'garden-foo'
    const user = fixtures.auth.createUser({
      id: 'foo@example.org',
    })

    it('should return shoots for a single namespace', async function () {
      mockRequest.mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())

      const res = await agent
        .get(`/api/namespaces/${namespace}/shoots`)
        .set('cookie', await user.cookie)
        .expect('content-type', /json/)
        .expect(200)

      expect(mockRequest).toHaveBeenCalledTimes(1)
      expect(mockRequest.mock.calls).toMatchSnapshot()

      expect(res.body.items.map(item => item.metadata.uid)).toEqual([1, 2, 3])
      expect(res.body).toMatchSnapshot()
    })

    it('should return all shoots for an admin user', async () => {
      mockRequest.mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())

      const res = await agent
        .get('/api/namespaces/_all/shoots')
        .set('cookie', await user.cookie)
        .expect('content-type', /json/)
        .expect(200)

      expect(mockRequest).toHaveBeenCalledTimes(1)
      expect(mockRequest.mock.calls).toMatchSnapshot()

      expect(res.body.items.map(item => item.metadata.uid)).toEqual([1, 2, 3, 4])
      expect(res.body).toMatchSnapshot()
    })

    it('should return all shoots for a non-admin user', async () => {
      mockRequest.mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess({ allowed: false }))
      mockRequest.mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())
      mockRequest.mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess({ allowed: false }))

      const res = await agent
        .get('/api/namespaces/_all/shoots')
        .set('cookie', await user.cookie)
        .expect('content-type', /json/)
        .expect(200)

      expect(mockRequest).toHaveBeenCalledTimes(3)
      expect(mockRequest.mock.calls).toMatchSnapshot()

      expect(res.body.items.map(item => item.metadata.uid)).toEqual([1, 2, 3])
      expect(res.body).toMatchSnapshot()
    })

    it('should return all unhealthy shoots', async () => {
      const labelSelector = 'shoot.gardener.cloud/status!=healthy'
      mockRequest.mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())

      const res = await agent
        .get('/api/namespaces/_all/shoots')
        .set('cookie', await user.cookie)
        .query({ labelSelector })
        .expect('content-type', /json/)
        .expect(200)

      expect(mockRequest).toHaveBeenCalledTimes(1)
      expect(mockRequest.mock.calls).toMatchSnapshot()

      expect(res.body.items.map(item => item.metadata.uid)).toEqual([3])
      expect(res.body).toMatchSnapshot()
    })

    it('should be forbidden to list shoots for a single namespace', async () => {
      mockRequest.mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess({ allowed: false }))

      const res = await agent
        .get(`/api/namespaces/${namespace}/shoots`)
        .set('cookie', await user.cookie)
        .expect('content-type', /json/)
        .expect(403)

      expect(mockRequest).toHaveBeenCalledTimes(1)
      expect(mockRequest.mock.calls).toMatchSnapshot()

      const { code, reason, message, status } = res.body
      expect({ code, reason, message, status }).toMatchSnapshot()
    })

    it('should create a shoot', async function () {
      const { metadata, spec } = fixtures.shoots.create({
        name: 'newShoot',
        namespace: 'garden-foo',
        project: 'foo',
        purpose: 'newPurpose',
        secretBindingName: 'foo-infra1',
      })

      mockRequest.mockImplementationOnce(fixtures.shoots.mocks.create())

      const res = await agent
        .post(`/api/namespaces/${namespace}/shoots`)
        .set('cookie', await user.cookie)
        .send({
          metadata,
          spec,
        })
        .expect('content-type', /json/)
        .expect(200)

      expect(mockRequest).toHaveBeenCalledTimes(1)
      expect(mockRequest.mock.calls).toMatchSnapshot()

      expect(res.body).toMatchSnapshot()
    })

    it('should return a shoot', async function () {
      mockRequest.mockImplementationOnce(fixtures.shoots.mocks.get())

      const res = await agent
        .get(`/api/namespaces/${namespace}/shoots/${name}`)
        .set('cookie', await user.cookie)
        .expect('content-type', /json/)
        .expect(200)

      expect(mockRequest).toHaveBeenCalledTimes(1)
      expect(mockRequest.mock.calls).toMatchSnapshot()

      expect(res.body).toMatchSnapshot()
    })

    it('should delete a shoot', async function () {
      mockRequest.mockImplementationOnce(fixtures.shoots.mocks.patch())
      mockRequest.mockImplementationOnce(fixtures.shoots.mocks.delete())

      const res = await agent
        .delete(`/api/namespaces/${namespace}/shoots/${name}`)
        .set('cookie', await user.cookie)
        .expect('content-type', /json/)
        .expect(200)

      expect(mockRequest).toHaveBeenCalledTimes(2)
      expect(mockRequest.mock.calls).toMatchSnapshot()

      expect(res.body).toMatchSnapshot()
    })

    it('should return shoot info', async function () {
      mockRequest.mockImplementationOnce(fixtures.shoots.mocks.get())
      mockRequest.mockImplementationOnce(fixtures.configmaps.mocks.get())
      mockRequest.mockImplementationOnce(fixtures.configmaps.mocks.get())
      mockRequest.mockImplementationOnce(fixtures.shoots.mocks.get())
      mockRequest.mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())
      mockRequest.mockImplementationOnce(fixtures.secrets.mocks.get())

      const res = await agent
        .get(`/api/namespaces/${namespace}/shoots/${name}/info`)
        .set('cookie', await user.cookie)
        .expect('content-type', /json/)
        .expect(200)

      expect(mockRequest).toHaveBeenCalledTimes(6)
      expect(mockRequest.mock.calls).toMatchSnapshot()

      expect(logger.info).toHaveBeenCalledTimes(0)

      expect(res.body).toMatchSnapshot({
        kubeconfigGardenlogin: expect.any(String),
      }, 'body')
      expect(yaml.load(res.body.kubeconfigGardenlogin)).toMatchSnapshot('body.kubeconfigGardenlogin')
    })

    it('should return shoot info without gardenlogin kubeconfig', async function () {
      const name = 'dummyShoot' // has no advertised addresses

      mockRequest.mockImplementationOnce(fixtures.shoots.mocks.get())
      mockRequest.mockImplementationOnce(fixtures.shoots.mocks.get())
      mockRequest.mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())
      mockRequest.mockImplementationOnce(fixtures.secrets.mocks.get())

      const res = await agent
        .get(`/api/namespaces/${namespace}/shoots/${name}/info`)
        .set('cookie', await user.cookie)
        .expect('content-type', /json/)
        .expect(200)

      expect(mockRequest).toHaveBeenCalledTimes(4)
      expect(mockRequest.mock.calls).toMatchSnapshot()

      expect(logger.info).toHaveBeenCalledTimes(1)
      expect(logger.info).toHaveBeenLastCalledWith('failed to get gardenlogin kubeconfig', 'Shoot has no advertised addresses')

      expect(res.body).toMatchSnapshot('body')
    })

    it('should replace shoot', async function () {
      const { metadata, spec } = fixtures.shoots.get(namespace, name)
      metadata.annotations['gardener.cloud/created-by'] = 'baz@example.org'
      metadata.labels = {
        foo: 'bar',
      }

      mockRequest.mockImplementationOnce(fixtures.shoots.mocks.get())
      mockRequest.mockImplementationOnce(fixtures.shoots.mocks.put())

      const res = await agent
        .put(`/api/namespaces/${namespace}/shoots/${name}`)
        .set('cookie', await user.cookie)
        .send({
          metadata,
          spec,
        })
        .expect('content-type', /json/)
        .expect(200)

      expect(mockRequest).toHaveBeenCalledTimes(2)
      expect(mockRequest.mock.calls).toMatchSnapshot()

      expect(res.body).toMatchSnapshot()
    })

    it('should replace shoot kubernetes version', async function () {
      mockRequest.mockImplementationOnce(fixtures.shoots.mocks.patch())

      const res = await agent
        .put(`/api/namespaces/${namespace}/shoots/${name}/spec/kubernetes/version`)
        .set('cookie', await user.cookie)
        .send({
          version: '1.17.1',
        })
        .expect('content-type', /json/)
        .expect(200)

      expect(mockRequest).toHaveBeenCalledTimes(1)
      expect(mockRequest.mock.calls).toMatchSnapshot()

      expect(res.body).toMatchSnapshot()
    })

    it('should replace shoot maintenance data', async function () {
      mockRequest.mockImplementationOnce(fixtures.shoots.mocks.patch())

      const res = await agent
        .put(`/api/namespaces/${namespace}/shoots/${name}/spec/maintenance`)
        .set('cookie', await user.cookie)
        .send({
          timeWindowBegin: '230000+0000',
          timeWindowEnd: '000000+0000',
          updateKubernetesVersion: true,
        })
        .expect('content-type', /json/)
        .expect(200)

      expect(mockRequest).toHaveBeenCalledTimes(1)
      expect(mockRequest.mock.calls).toMatchSnapshot()

      expect(res.body).toMatchSnapshot()
    })

    it('should replace shoot workers', async function () {
      mockRequest.mockImplementationOnce(fixtures.shoots.mocks.patch())

      const res = await agent
        .patch(`/api/namespaces/${namespace}/shoots/${name}/spec/provider`)
        .set('cookie', await user.cookie)
        .send({
          workers: [{
            name: 'worker-g5rk1',
          }],
          network: {
            zones: [{
              workers: '10.250.0.0/20',
            }],
          },
        })
        .expect('content-type', /json/)
        .expect(200)

      expect(mockRequest).toHaveBeenCalledTimes(1)
      expect(mockRequest.mock.calls).toMatchSnapshot()

      expect(res.body).toMatchSnapshot()
    })

    it('should replace hibernation enabled', async function () {
      mockRequest.mockImplementationOnce(fixtures.shoots.mocks.patch())

      const res = await agent
        .put(`/api/namespaces/${namespace}/shoots/${name}/spec/hibernation/enabled`)
        .set('cookie', await user.cookie)
        .send({
          enabled: true,
        })
        .expect('content-type', /json/)
        .expect(200)

      expect(mockRequest).toHaveBeenCalledTimes(1)
      expect(mockRequest.mock.calls).toMatchSnapshot()

      expect(res.body).toMatchSnapshot()
    })

    it('should replace hibernation schedules', async function () {
      mockRequest.mockImplementationOnce(fixtures.shoots.mocks.patch())

      const res = await agent
        .put(`/api/namespaces/${namespace}/shoots/${name}/spec/hibernation/schedules`)
        .set('cookie', await user.cookie)
        .send([{
          start: '00 17 * * 1,2,3,4,5,6',
          end: '00 08 * * 1,2,3,4,5,6',
        }])
        .expect('content-type', /json/)
        .expect(200)

      expect(mockRequest).toHaveBeenCalledTimes(1)
      expect(mockRequest.mock.calls).toMatchSnapshot()

      expect(res.body).toMatchSnapshot()
    })

    it('should patch annotations', async function () {
      mockRequest.mockImplementationOnce(fixtures.shoots.mocks.patch())

      const res = await agent
        .patch(`/api/namespaces/${namespace}/shoots/${name}/metadata/annotations`)
        .set('cookie', await user.cookie)
        .send({
          foo: 'bar',
        })
        .expect('content-type', /json/)
        .expect(200)

      expect(mockRequest).toHaveBeenCalledTimes(1)
      expect(mockRequest.mock.calls).toMatchSnapshot()

      expect(res.body).toMatchSnapshot()
    })

    it('should replace purpose', async function () {
      mockRequest.mockImplementationOnce(fixtures.shoots.mocks.patch())

      const res = await agent
        .put(`/api/namespaces/${namespace}/shoots/${name}/spec/purpose`)
        .set('cookie', await user.cookie)
        .send({
          purpose: 'testing',
        })
        .expect('content-type', /json/)
        .expect(200)

      expect(mockRequest).toHaveBeenCalledTimes(1)
      expect(mockRequest.mock.calls).toMatchSnapshot()

      expect(res.body).toMatchSnapshot()
    })

    it('should replace shoot seedname', async function () {
      mockRequest.mockImplementationOnce(fixtures.shoots.mocks.patchBinding())

      const res = await agent
        .put(`/api/namespaces/${namespace}/shoots/${name}/spec/seedname`)
        .set('cookie', await user.cookie)
        .send({
          seedName: 'foo-new-seed',
        })
        .expect('content-type', /json/)
        .expect(200)

      expect(mockRequest).toHaveBeenCalledTimes(1)
      expect(mockRequest.mock.calls).toMatchSnapshot()

      expect(res.body).toMatchSnapshot()
    })

    it('should replace addons', async function () {
      mockRequest.mockImplementationOnce(fixtures.shoots.mocks.patch())

      const res = await agent
        .put(`/api/namespaces/${namespace}/shoots/${name}/spec/addons`)
        .set('cookie', await user.cookie)
        .send([
          {
            testAddon: {
              enabled: true,
              foo: 'bar',
            },
          },
        ])
        .expect('content-type', /json/)
        .expect(200)

      expect(mockRequest).toHaveBeenCalledTimes(1)
      expect(mockRequest.mock.calls).toMatchSnapshot()

      expect(res.body).toMatchSnapshot()
    })

    it('should return a shoot admin kubeconfig', async function () {
      mockRequest.mockImplementationOnce(fixtures.shoots.mocks.createAdminKubeconfigRequest())

      const res = await agent
        .post(`/api/namespaces/${namespace}/shoots/${name}/adminkubeconfig`)
        .set('cookie', await user.cookie)
        .send({
          expirationSeconds: 600,
        })
        .expect('content-type', /json/)
        .expect(200)

      expect(mockRequest).toHaveBeenCalledTimes(1)
      expect(mockRequest.mock.calls).toMatchSnapshot()

      expect(res.body).toMatchSnapshot({
        kubeconfig: expect.any(String),
      }, 'body')
      expect(yaml.load(res.body.kubeconfig)).toMatchSnapshot('body.kubeconfig')
    })
  })
})
