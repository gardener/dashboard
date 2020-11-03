//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const app = require('../lib/app')
const { k8s, auth, oidc, github, setup, teardown, verifyAndCleanAll } = require('./support/nocks')

describe('acceptance', function () {
  const agent = global.createAgent(app)
  const sandbox = sinon.createSandbox()
  const context = { agent, sandbox, k8s, auth, oidc, github }

  before(function () {
    setup()
  })

  after(function () {
    agent.close()
    teardown()
  })

  afterEach(function () {
    try {
      verifyAndCleanAll()
    } finally {
      if (sandbox) {
        sandbox.restore()
      }
    }
  })

  describe('api', function () {
    describe('cloudprofiles', function () {
      require('./acceptance/api.cloudprofiles.spec.js')(context)
    })

    describe('seeds', function () {
      require('./acceptance/api.seeds.spec.js')(context)
    })

    describe('info', function () {
      require('./acceptance/api.info.spec.js')(context)
    })

    describe('infrastructureSecrets', function () {
      require('./acceptance/api.infrastructureSecrets.spec.js')(context)
    })

    describe('members', function () {
      require('./acceptance/api.members.spec.js')(context)
    })

    describe('projects', function () {
      require('./acceptance/api.projects.spec.js')(context)
    })

    describe('shoots', function () {
      require('./acceptance/api.shoots.spec.js')(context)
    })

    describe('terminals', function () {
      require('./acceptance/api.terminals.spec.js')(context)
    })

    describe('user', function () {
      require('./acceptance/api.user.spec.js')(context)
    })
  })

  describe('auth', function () {
    require('./acceptance/auth.spec.js')(context)
  })

  describe('config', function () {
    require('./acceptance/config.spec.js')(context)
  })

  describe('healthz', function () {
    require('./acceptance/healthz.spec.js')(context)
  })

  describe('openapi', function () {
    require('./acceptance/openapi.spec.js')(context)
  })

  describe('security', function () {
    require('./acceptance/security.spec.js')(context)
  })

  describe('webhook', function () {
    require('./acceptance/webhook.spec.js')(context)
  })

  describe('io', function () {
    require('./acceptance/io.spec.js')(context)
  })
})
