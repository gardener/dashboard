//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { mockRequest } = require('@gardener-dashboard/request')
const kubeconfig = require('@gardener-dashboard/kube-config')
const originalKubeconfig = jest.requireActual('@gardener-dashboard/kube-config')
const logger = require('../../lib/logger')

describe('api', function () {
  let agent

  beforeAll(() => {
    agent = createAgent()
  })

  afterAll(() => {
    return agent.close()
  })

  afterEach(() => {
    mockRequest.mockReset()
    kubeconfig.cleanKubeconfig.mockClear()
  })

  describe('shoots', function () {
    const name = 'barShoot'
    const namespace = 'garden-foo'
    const user = fixtures.auth.createUser({
      id: 'foo@example.org'
    })
    const admin = fixtures.auth.createUser({
      id: 'admin@example.org'
    })

    it('should return three shoots', async function () {
      mockRequest.mockImplementationOnce(fixtures.shoots.mocks.list())

      const res = await agent
        .get(`/api/namespaces/${namespace}/shoots`)
        .set('cookie', await user.cookie)
        .expect('content-type', /json/)
        .expect(200)

      expect(mockRequest).toBeCalledTimes(1)
      expect(mockRequest.mock.calls).toMatchSnapshot()

      expect(res.body).toMatchSnapshot()
    })

    it('should create a shoot', async function () {
      const { metadata, spec } = fixtures.shoots.create({
        name: 'newShoot',
        namespace: 'garden-foo',
        project: 'foo',
        purpose: 'newPurpose',
        secretBindingName: 'foo-infra1'
      })

      mockRequest.mockImplementationOnce(fixtures.shoots.mocks.create())

      const res = await agent
        .post(`/api/namespaces/${namespace}/shoots`)
        .set('cookie', await user.cookie)
        .send({
          metadata,
          spec
        })
        .expect('content-type', /json/)
        .expect(200)

      expect(mockRequest).toBeCalledTimes(1)
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

      expect(mockRequest).toBeCalledTimes(1)
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

      expect(mockRequest).toBeCalledTimes(2)
      expect(mockRequest.mock.calls).toMatchSnapshot()

      expect(res.body).toMatchSnapshot()
    })

    it('should return shoot info', async function () {
      mockRequest.mockImplementationOnce(fixtures.shoots.mocks.get())
      mockRequest.mockImplementationOnce(fixtures.secrets.mocks.get())
      mockRequest.mockImplementationOnce(fixtures.shoots.mocks.get())
      mockRequest.mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())
      mockRequest.mockImplementationOnce(fixtures.secrets.mocks.get())

      const res = await agent
        .get(`/api/namespaces/${namespace}/shoots/${name}/info`)
        .set('cookie', await user.cookie)
        .expect('content-type', /json/)
        .expect(200)

      expect(mockRequest).toBeCalledTimes(5)
      expect(mockRequest.mock.calls).toMatchSnapshot()

      expect(kubeconfig.cleanKubeconfig).toBeCalledTimes(1)

      expect(res.body).toMatchSnapshot()
    })

    it('should return shoot seed info when no fallback is needed', async function () {
      jest.spyOn(originalKubeconfig, 'cleanKubeconfig')

      mockRequest.mockImplementationOnce(fixtures.shoots.mocks.get())
      mockRequest.mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())
      mockRequest.mockImplementationOnce(fixtures.secrets.mocks.get())
      mockRequest.mockImplementationOnce(fixtures.secrets.mocks.list())

      const res = await agent
        .get(`/api/namespaces/${namespace}/shoots/${name}/seed-info`)
        .set('cookie', await admin.cookie)
        .expect('content-type', /json/)
        .expect(200)

      expect(mockRequest).toBeCalledTimes(4)
      expect(mockRequest.mock.calls).toMatchSnapshot()

      expect(originalKubeconfig.cleanKubeconfig).toBeCalledTimes(1)
      originalKubeconfig.cleanKubeconfig.mockRestore()

      expect(res.body).toMatchSnapshot()
    })

    it('should return shoot seed info when need to fallback to old monitoring secret', async function () {
      jest.spyOn(originalKubeconfig, 'cleanKubeconfig')

      mockRequest.mockImplementationOnce(fixtures.shoots.mocks.get())
      mockRequest.mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())
      mockRequest.mockImplementationOnce(fixtures.secrets.mocks.get())
      mockRequest.mockImplementationOnce(fixtures.secrets.mocks.list({ forceEmpty: true }))
      mockRequest.mockImplementationOnce(fixtures.secrets.mocks.get())

      const res = await agent
        .get(`/api/namespaces/${namespace}/shoots/${name}/seed-info`)
        .set('cookie', await admin.cookie)
        .expect('content-type', /json/)
        .expect(200)

      expect(mockRequest).toBeCalledTimes(5)
      expect(mockRequest.mock.calls).toMatchSnapshot()

      expect(originalKubeconfig.cleanKubeconfig).toBeCalledTimes(1)
      originalKubeconfig.cleanKubeconfig.mockRestore()

      expect(res.body).toMatchSnapshot()
    })

    it('should not return shoot seed info when seed.spec.secretRef missing', async function () {
      const name = 'dummyShoot'

      mockRequest.mockImplementationOnce(fixtures.shoots.mocks.get())
      mockRequest.mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())

      const res = await agent
        .get(`/api/namespaces/${namespace}/shoots/${name}/seed-info`)
        .set('cookie', await admin.cookie)
        .expect('content-type', /json/)
        .expect(200)

      expect(mockRequest).toBeCalledTimes(2)
      expect(mockRequest.mock.calls).toMatchSnapshot()

      expect(logger.info).toBeCalledTimes(1)

      expect(res.body).toMatchSnapshot()
    })

    it('should replace shoot', async function () {
      const { metadata, spec } = fixtures.shoots.get(namespace, name)
      metadata.annotations['gardener.cloud/created-by'] = 'baz@example.org'
      metadata.labels = {
        foo: 'bar'
      }

      mockRequest.mockImplementationOnce(fixtures.shoots.mocks.get())
      mockRequest.mockImplementationOnce(fixtures.shoots.mocks.put())

      const res = await agent
        .put(`/api/namespaces/${namespace}/shoots/${name}`)
        .set('cookie', await user.cookie)
        .send({
          metadata,
          spec
        })
        .expect('content-type', /json/)
        .expect(200)

      expect(mockRequest).toBeCalledTimes(2)
      expect(mockRequest.mock.calls).toMatchSnapshot()

      expect(res.body).toMatchSnapshot()
    })

    it('should replace shoot kubernetes version', async function () {
      mockRequest.mockImplementationOnce(fixtures.shoots.mocks.patch())

      const res = await agent
        .put(`/api/namespaces/${namespace}/shoots/${name}/spec/kubernetes/version`)
        .set('cookie', await user.cookie)
        .send({
          version: '1.17.1'
        })
        .expect('content-type', /json/)
        .expect(200)

      expect(mockRequest).toBeCalledTimes(1)
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
          updateKubernetesVersion: true
        })
        .expect('content-type', /json/)
        .expect(200)

      expect(mockRequest).toBeCalledTimes(1)
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
            name: 'worker-g5rk1'
          }],
          network: {
            zones: [{
              workers: '10.250.0.0/20'
            }]
          }
        })
        .expect('content-type', /json/)
        .expect(200)

      expect(mockRequest).toBeCalledTimes(1)
      expect(mockRequest.mock.calls).toMatchSnapshot()

      expect(res.body).toMatchSnapshot()
    })

    it('should replace hibernation enabled', async function () {
      mockRequest.mockImplementationOnce(fixtures.shoots.mocks.patch())

      const res = await agent
        .put(`/api/namespaces/${namespace}/shoots/${name}/spec/hibernation/enabled`)
        .set('cookie', await user.cookie)
        .send({
          enabled: true
        })
        .expect('content-type', /json/)
        .expect(200)

      expect(mockRequest).toBeCalledTimes(1)
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
          end: '00 08 * * 1,2,3,4,5,6'
        }])
        .expect('content-type', /json/)
        .expect(200)

      expect(mockRequest).toBeCalledTimes(1)
      expect(mockRequest.mock.calls).toMatchSnapshot()

      expect(res.body).toMatchSnapshot()
    })

    it('should patch annotations', async function () {
      mockRequest.mockImplementationOnce(fixtures.shoots.mocks.patch())

      const res = await agent
        .patch(`/api/namespaces/${namespace}/shoots/${name}/metadata/annotations`)
        .set('cookie', await user.cookie)
        .send({
          foo: 'bar'
        })
        .expect('content-type', /json/)
        .expect(200)

      expect(mockRequest).toBeCalledTimes(1)
      expect(mockRequest.mock.calls).toMatchSnapshot()

      expect(res.body).toMatchSnapshot()
    })

    it('should replace purpose', async function () {
      mockRequest.mockImplementationOnce(fixtures.shoots.mocks.patch())

      const res = await agent
        .put(`/api/namespaces/${namespace}/shoots/${name}/spec/purpose`)
        .set('cookie', await user.cookie)
        .send({
          purpose: 'testing'
        })
        .expect('content-type', /json/)
        .expect(200)

      expect(mockRequest).toBeCalledTimes(1)
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
              foo: 'bar'
            }
          }
        ])
        .expect('content-type', /json/)
        .expect(200)

      expect(mockRequest).toBeCalledTimes(1)
      expect(mockRequest.mock.calls).toMatchSnapshot()

      expect(res.body).toMatchSnapshot()
    })

    it('should replace dns', async function () {
      mockRequest.mockImplementationOnce(fixtures.shoots.mocks.patch())

      const res = await agent
        .put(`/api/namespaces/${namespace}/shoots/${name}/spec/dns`)
        .set('cookie', await user.cookie)
        .send({
          domain: 'foo.bar',
          providers: [
            {
              primary: 'true',
              secretName: 'foo-secret',
              type: 'foo-provider'
            }
          ]
        })
        .expect('content-type', /json/)
        .expect(200)

      expect(mockRequest).toBeCalledTimes(1)
      expect(mockRequest.mock.calls).toMatchSnapshot()

      expect(res.body).toMatchSnapshot()
    })
  })
})
