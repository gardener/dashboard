//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
} from 'vitest'

describe('debug createAgent', function () {
  let agent

  beforeAll(async () => {
    agent = await createAgent()
  })

  afterAll(() => {
    if (agent) {
      return agent.close()
    }
  })

  it('should get healthz', async () => {
    const res = await agent
      .get('/healthz')
    expect(res.status).toBe(200)
  })
})
