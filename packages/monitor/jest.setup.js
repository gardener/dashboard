//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { jest } from '@jest/globals'
import http from 'http'
import { Test } from 'supertest'

const promClientMock = await import('./__mocks__/prom-client.js')
jest.unstable_mockModule('prom-client', () => {
  return promClientMock
})

const responseTimeMock = await import('./__mocks__/response-time.js')
jest.unstable_mockModule('response-time', () => {
  return responseTimeMock
})

const loggerMock = await import('./__mocks__/@gardener-dashboard/logger.js')
jest.unstable_mockModule('@gardener-dashboard/logger', () => {
  return loggerMock
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

global.createAgent = createAgent
