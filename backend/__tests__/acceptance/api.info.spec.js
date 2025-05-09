//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const createError = require('http-errors')
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
      namespace: 'gardener',
    }
    const caBundle = fixtures.helper.toBase64('ca')

    it('should reject requests csrf protection error', async function () {
      const res = await agent
        .post('/api/info')
        .unset('x-requested-with')
        .expect('content-type', /json/)
        .expect(403)

      expect(mockRequest).not.toHaveBeenCalled()

      expect(res.body).toMatchSnapshot({
        details: expect.any(Object),
      })
    })

    it('should reject requests without authorization header', async function () {
      const res = await agent
        .get('/api/info')
        .expect('content-type', /json/)
        .expect(401)

      expect(mockRequest).not.toHaveBeenCalled()

      expect(res.body).toMatchSnapshot({
        details: expect.any(Object),
      })
    })

    it('should reject requests with invalid signature', async function () {
      const user = fixtures.user.create({ id, aud }, true)

      const res = await agent
        .get('/api/info')
        .set('cookie', await user.cookie)
        .expect('content-type', /json/)
        .expect(401)

      expect(mockRequest).not.toHaveBeenCalled()

      expect(res.body).toMatchSnapshot({
        details: expect.any(Object),
      })
    })

    it('should reject requests with invalid audience', async function () {
      const user = fixtures.user.create({ id, aud: ['invalid-audience'] })

      const res = await agent
        .get('/api/info')
        .set('cookie', await user.cookie)
        .expect('content-type', /json/)
        .expect(401)

      expect(mockRequest).not.toHaveBeenCalled()

      expect(res.body).toMatchSnapshot({
        details: expect.any(Object),
      })
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

      expect(mockRequest).toHaveBeenCalledTimes(2)
      expect(mockRequest.mock.calls).toMatchSnapshot()

      expect(res.body).toMatchSnapshot({
        version: expect.any(String),
      })
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

      expect(mockRequest).toHaveBeenCalledTimes(2)
      expect(mockRequest.mock.calls).toMatchSnapshot()

      expect(res.body).toMatchSnapshot({
        version: expect.any(String),
      })
    })
  })
})
