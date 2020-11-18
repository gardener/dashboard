//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const http = require('http')
const { Test } = require('supertest')
const { createTerminus } = require('@godaddy/terminus')

function createAgent (app) {
  const server = http.createServer(app)
  const healthCheck = app.get('healthCheck')
  if (typeof healthCheck === 'function') {
    const signal = 'SIGTERM'
    const healthChecks = {
      '/healthz': () => healthCheck(false),
      '/healthz-transitive': () => healthCheck(true)
    }
    process.removeAllListeners(signal)
    this.server = createTerminus(this.server, { signal, healthChecks })
  }

  const agent = {
    server,
    close () {
      server.close()
    }
  }

  for (const method of ['get', 'put', 'patch', 'delete', 'post']) {
    agent[method] = function (url) {
      const test = new Test(server, method, url)
      test.set('x-requested-with', 'XMLHttpRequest')
      return test
    }
  }
  return agent
}

jest.mock('./lib/config/gardener', () => {
  const fixtures = require('./__fixtures__')
  const configGardener = jest.requireActual('./lib/config/gardener')
  const mockFiles = new Map()
  for (const [path, data] of Object.entries(fixtures.mockFiles)) {
    mockFiles.set(path, data)
  }
  return {
    ...configGardener,
    readConfig: jest.fn(path => mockFiles.get(path))
  }
})

global.createAgent = createAgent
