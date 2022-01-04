//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
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

    const res = await agent
      .get('/config.json')
      .expect('content-type', /json/)
      .expect(200)

    expect(mockRequest).toBeCalledTimes(1)
    expect(mockRequest.mock.calls).toMatchSnapshot()

    expect(res.body).toMatchSnapshot()
  })
})
