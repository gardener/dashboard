//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { pick } = require('lodash')
const createError = require('http-errors')
const { version: dashboardVersion } = require('../../package')
const { encodeBase64 } = require('../../lib/utils')
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

      expect(mockRequest).not.toBeCalled()

      expect(res.body.reason).toBe('Forbidden')
      expect(res.body.details).toHaveProperty('name', 'ForbiddenError')
      expect(res.body.message).toMatch('CSRF protection')
    })

    it('should reject requests without authorization header', async function () {
      const res = await agent
        .get('/api/info')
        .expect('content-type', /json/)
        .expect(401)

      expect(mockRequest).not.toBeCalled()

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

      expect(mockRequest).not.toBeCalled()

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

      expect(mockRequest).not.toBeCalled()

      expect(res.body.reason).toBe('Unauthorized')
      expect(res.body.details).toHaveProperty('name', 'UnauthorizedError')
      expect(res.body.message).toMatch('audience invalid')
    })

    it('should return information with version', async function () {
      const user = fixtures.user.create({ id, aud })
      const gardenerVersion = { major: '1', minor: '0' }

      mockRequest.mockResolvedValueOnce({ spec: { service, caBundle } })
      mockRequest.mockResolvedValueOnce(gardenerVersion)

      const res = await agent
        .get('/api/info')
        .set('cookie', await user.cookie)
        .expect('content-type', /json/)
        .expect(200)

      expect(mockRequest).toBeCalledTimes(2)
      expect(mockRequest.mock.calls[0]).toEqual([{
        ...pick(fixtures.kube, [':scheme', ':authority', 'authorization']),
        ':method': 'get',
        ':path': '/apis/apiregistration.k8s.io/v1/apiservices/v1beta1.core.gardener.cloud'
      }])
      expect(mockRequest.mock.calls[1]).toEqual([{
        ':scheme': 'https',
        ':authority': `${service.name}.${service.namespace}`,
        ':method': 'get',
        ':path': '/version'
      }])

      expect(res.body).toHaveProperty('version', dashboardVersion)
      expect(res.body.gardenerVersion).toEqual(gardenerVersion)
      expect(res.body).not.toHaveProperty('user')
    })

    it('should return information without version', async function () {
      const user = fixtures.user.create({ id, aud })

      mockRequest.mockResolvedValueOnce({ spec: { service, caBundle } })
      mockRequest.mockRejectedValueOnce(createError(404, 'Not found'))

      const res = await agent
        .get('/api/info')
        .set('cookie', await user.cookie)
        .expect('content-type', /json/)
        .expect(200)

      expect(mockRequest).toBeCalledTimes(2)
      expect(mockRequest.mock.calls[0]).toEqual([{
        ...pick(fixtures.kube, [':scheme', ':authority', 'authorization']),
        ':method': 'get',
        ':path': '/apis/apiregistration.k8s.io/v1/apiservices/v1beta1.core.gardener.cloud'
      }])
      expect(mockRequest.mock.calls[1]).toEqual([{
        ':scheme': 'https',
        ':authority': `${service.name}.${service.namespace}`,
        ':method': 'get',
        ':path': '/version'
      }])

      expect(res.body).toHaveProperty('version', dashboardVersion)
      expect(res.body).not.toHaveProperty('gardenerVersion')
      expect(res.body).not.toHaveProperty('user')
    })
  })
})
