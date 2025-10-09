//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { mockRequest } = require('@gardener-dashboard/request')

describe('config', function () {
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

  it('should return the frontend configuration', async function () {
    mockRequest.mockResolvedValueOnce({ data: { 'cluster-identity': 'test-id' } })

    const user = fixtures.auth.createUser({ id: 'john.doe@example.org' })

    const res = await agent
      .get('/api/config')
      .set('cookie', await user.cookie)
      .expect('content-type', /json/)
      .expect(200)

    expect(mockRequest).toHaveBeenCalledTimes(1)
    expect(mockRequest.mock.calls).toMatchSnapshot()

    expect(res.body).toMatchSnapshot()
  })
})
