//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const http = require('http')
const { Test } = require('supertest')
const { createTerminus } = require('@godaddy/terminus')
const fixtures = require('./__fixtures__')

function createAgent () {
  const app = require('./lib/app')
  let server = http.createServer(app)
  const healthCheck = app.get('healthCheck')
  if (typeof healthCheck === 'function') {
    const signal = 'SIGTERM'
    const healthChecks = {
      '/healthz': () => healthCheck(false),
      '/healthz-transitive': () => healthCheck(true)
    }
    process.removeAllListeners(signal)
    server = createTerminus(server, { signal, healthChecks })
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
  const originalGardener = jest.requireActual('./lib/config/gardener')
  const mockFiles = new Map()
  for (const [path, data] of fixtures.config.list()) {
    mockFiles.set(path, data)
  }
  return {
    ...originalGardener,
    readConfig: jest.fn(path => mockFiles.get(path))
  }
})

jest.mock('./lib/cache', () => {
  const fixtures = require('./__fixtures__')
  const originalCache = jest.requireActual('./lib/cache')
  const createTicketCache = jest.requireActual('./lib/cache/tickets')
  const { cache } = originalCache
  cache.cloudprofiles.replace(fixtures.cloudprofiles.list())
  cache.seeds.replace(fixtures.seeds.list())
  cache.quotas.replace(fixtures.quotas.list())
  cache.projects.replace(fixtures.projects.list())
  cache.ticketCache = createTicketCache()
  cache.resetTicketCache = () => (cache.ticketCache = createTicketCache())
  return originalCache
})

global.createAgent = createAgent
global.fixtures = fixtures
