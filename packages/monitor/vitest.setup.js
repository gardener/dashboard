//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { vi } from 'vitest'
import http from 'http'
import { Test } from 'supertest'

vi.mock('prom-client', async () => {
  return import('./__tests__/mocks/prom-client.js')
})

vi.mock('response-time', async () => {
  return import('./__tests__/mocks/response-time.js')
})

vi.mock('@gardener-dashboard/logger', async () => {
  return import('./__tests__/mocks/@gardener-dashboard/logger.js')
})

async function createHttpAgent () {
  const { default: app } = await import('./lib/app.js')
  const server = http.createServer(app)

  const agent = {
    server,
    close () {
      server.close()
    },
  }

  for (const method of ['get', 'put', 'patch', 'delete', 'post']) {
    agent[method] = function (url) {
      const test = new Test(server, method, url)
      return test
    }
  }
  return agent
}

async function createAgent () {
  return createHttpAgent()
}

vi.stubGlobal('createAgent', createAgent)
