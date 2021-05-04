//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

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
  describe('user', function () {
    const user = fixtures.auth.createUser({ id: 'bar@example.org' })

    it('should return information about the user', async function () {
      mockRequest.mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectAccess())

      const res = await agent
        .get('/api/user/privileges')
        .set('cookie', await user.cookie)
        .expect('content-type', /json/)
        .expect(200)

      expect(mockRequest).toBeCalledTimes(1)
      expect(mockRequest.mock.calls).toMatchSnapshot()

      expect(res.body).toMatchSnapshot()
    })

    it('should return the bearer token of the user', async function () {
      const res = await agent
        .get('/api/user/token')
        .set('cookie', await user.cookie)
        .expect('content-type', /json/)
        .expect(200)

      expect(mockRequest).not.toBeCalled()

      expect(res.body).toMatchSnapshot()
    })

    it('should return selfsubjectrules for the user', async function () {
      mockRequest.mockImplementationOnce(fixtures.auth.mocks.reviewSelfSubjectRules())

      const res = await agent
        .post('/api/user/subjectrules/')
        .set('cookie', await user.cookie)
        .send({
          namespace: 'garden-foo'
        })
        .expect('content-type', /json/)
        .expect(200)

      expect(mockRequest).toBeCalledTimes(1)
      expect(mockRequest.mock.calls).toMatchSnapshot()

      expect(res.body).toMatchSnapshot()
    })

    it('should return the kubeconfig data the user', async function () {
      const res = await agent
        .get('/api/user/kubeconfig')
        .set('cookie', await user.cookie)
        .expect('content-type', /json/)
        .expect(200)

      expect(mockRequest).not.toBeCalled()

      expect(res.body).toMatchSnapshot()
    })
  })
})
