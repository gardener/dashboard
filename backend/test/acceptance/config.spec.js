//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const createError = require('http-errors')

describe('config', function () {
  let agent
  const api = {
    kube: {
      request: () => {}
    }
  }

  beforeAll(() => {
    require('@gardener-dashboard/request')
      .__setMockClients({
        'https://kubernetes:6443': api.kube
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

  it('should return the frontend configuration', async function () {
    const res = await agent
      .get('/config.json')
      .expect('content-type', /json/)
      .expect(200)

    expect(Array.isArray(res.body.helpMenuItems)).toBe(true)
    expect(res.body.helpMenuItems).toHaveLength(3)
    expect(res.body.landingPageUrl).toBe('https://gardener.cloud/')
  })
})
