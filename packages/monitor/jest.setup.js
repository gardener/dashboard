//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const http = require('http')
const { Test } = require('supertest')
const app = require('./lib/app')

function createHttpAgent () {
  const server = http.createServer(app)

  const agent = {
    server,
    close () {
      server.close()
    }
  }

  for (const method of ['get', 'put', 'patch', 'delete', 'post']) {
    agent[method] = function (url) {
      const test = new Test(server, method, url)
      return test
    }
  }
  return agent
}

function createAgent () {
  return createHttpAgent()
}

global.createAgent = createAgent
