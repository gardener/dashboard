//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const createError = require('http-errors')
const { version: dashboardVersion } = require('../../package')
const { encodeBase64 } = require('../../lib/utils')

describe('api', function () {
  let agent
  const api = {
    kube: {
      request: () => {}
    },
    gardener: {
      request: () => {}
    }
  }

  beforeAll(() => {
    require('@gardener-dashboard/request')
      .__setMockClients({
        'https://kubernetes:6443': api.kube,
        'https://gardener-apiserver.gardener': api.gardener
      })
    agent = createAgent()
  })

  afterAll(() => {
    return agent.close()
  })

  beforeEach(() => {
    for (const client of Object.values(api)) {
      client.request = jest.fn(() => Promise.reject(createError(501, 'Not Implemented')))
    }
  })

  describe('info', function () {
    const id = 'john.doe@example.org'
    const aud = ['gardener']
    const service = {
      name: 'gardener-apiserver',
      namespace: 'gardener'
    }
    const caBundle = encodeBase64('ca')

    it('should reject requests csrf protection error', async function () {
      const res = await agent
        .post('/api/info')
        .unset('x-requested-with')
        .expect('content-type', /json/)
        .expect(403)

      expect(api.kube.request).not.toBeCalled()
      expect(res.body.reason).toBe('Forbidden')
      expect(res.body.details).toHaveProperty('name', 'ForbiddenError')
      expect(res.body.message).toMatch('CSRF protection')
    })

    it('should reject requests without authorization header', async function () {
      const res = await agent
        .get('/api/info')
        .expect('content-type', /json/)
        .expect(401)

      expect(api.kube.request).not.toBeCalled()
      expect(res.body.reason).toBe('Unauthorized')
      expect(res.body.details).toHaveProperty('name', 'UnauthorizedError')
      expect(res.body.message).toMatch('authorization token')
    })

    it('should reject requests with invalid signature', async function () {
      const user = fixtures.user.create({ id, aud }, true)

      const res = await agent
        .get('/api/info')
        .set('cookie', await user.cookie)
        .expect('content-type', /json/)
        .expect(401)

      expect(api.kube.request).not.toBeCalled()

      expect(res.body.reason).toBe('Unauthorized')
      expect(res.body.details).toHaveProperty('name', 'UnauthorizedError')
      expect(res.body.message).toMatch('invalid signature')
    })

    it('should reject requests with invalid audience', async function () {
      const user = fixtures.user.create({ id, aud: ['invalid-audience'] })

      const res = await agent
        .get('/api/info')
        .set('cookie', await user.cookie)
        .expect('content-type', /json/)
        .expect(401)

      expect(api.kube.request).not.toBeCalled()

      expect(res.body.reason).toBe('Unauthorized')
      expect(res.body.details).toHaveProperty('name', 'UnauthorizedError')
      expect(res.body.message).toMatch('audience invalid')
    })

    it('should return information with version', async function () {
      const user = fixtures.user.create({ id, aud })
      const gardenerVersion = { major: '1', minor: '0' }

      api.kube.request.mockResolvedValueOnce({ spec: { service, caBundle } })
      api.gardener.request.mockResolvedValueOnce(gardenerVersion)

      const res = await agent
        .get('/api/info')
        .set('cookie', await user.cookie)
        .expect('content-type', /json/)
        .expect(200)

      expect(api.kube.request).toBeCalledTimes(1)
      expect(api.kube.request.mock.calls[0]).toEqual([
        'apiservices/v1beta1.core.gardener.cloud',
        expect.objectContaining({
          method: 'get'
        })
      ])
      expect(api.gardener.request).toBeCalledTimes(1)
      expect(api.gardener.request.mock.calls[0]).toEqual([
        'version'
      ])

      expect(res.body).toHaveProperty('version', dashboardVersion)
      expect(res.body.gardenerVersion).toEqual(gardenerVersion)
      expect(res.body).not.toHaveProperty('user')
    })

    it('should return information without version', async function () {
      const user = fixtures.user.create({ id, aud })

      api.kube.request.mockResolvedValueOnce({ spec: { service, caBundle } })
      api.gardener.request.mockRejectedValueOnce(createError(404, 'Not found'))

      const res = await agent
        .get('/api/info')
        .set('cookie', await user.cookie)
        .expect('content-type', /json/)
        .expect(200)

      expect(api.kube.request).toBeCalledTimes(1)
      expect(api.kube.request.mock.calls[0]).toEqual([
        'apiservices/v1beta1.core.gardener.cloud',
        expect.objectContaining({
          method: 'get'
        })
      ])
      expect(api.gardener.request).toBeCalledTimes(1)
      expect(api.gardener.request.mock.calls[0]).toEqual([
        'version'
      ])

      expect(res.body).toHaveProperty('version', dashboardVersion)
      expect(res.body).not.toHaveProperty('gardenerVersion')
      expect(res.body).not.toHaveProperty('user')
    })
  })
})
