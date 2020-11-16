//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { Test } = require('supertest')

const http = require('http')
const { createTerminus } = require('@godaddy/terminus')

const HTTP_METHODS = ['get', 'put', 'patch', 'delete', 'post']

jest.mock('fs')

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
  for (const method of HTTP_METHODS) {
    agent[method] = function (url) {
      const test = new Test(server, method, url)
      test.set('x-requested-with', 'XMLHttpRequest')
      return test
    }
  }
  return agent
}

global.createAgent = createAgent
