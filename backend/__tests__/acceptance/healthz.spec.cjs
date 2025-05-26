//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { pick } = require('lodash')
const { mockRequest } = require('@gardener-dashboard/request')

describe('healthz', function () {
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

  it('should return the backend transitive healthz status', async function () {
    mockRequest.mockResolvedValueOnce('ok')

    const res = await agent
      .get('/healthz-transitive')
      .expect('content-type', /json/)
      .expect(200)

    expect(mockRequest).toHaveBeenCalledTimes(1)
    expect(mockRequest.mock.calls[0]).toEqual([{
      ...pick(fixtures.kube, [':scheme', ':authority', 'authorization']),
      ':method': 'get',
      ':path': '/healthz',
    }])

    expect(res.body).toEqual({ status: 'ok' })
  })

  it('should return the backend healthz status', async function () {
    const res = await agent
      .get('/healthz')
      .expect('content-type', /json/)
      .expect(200)

    expect(res.body).toEqual({ status: 'ok' })
  })
})
