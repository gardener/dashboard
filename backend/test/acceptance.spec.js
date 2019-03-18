//
// Copyright (c) 2018 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

'use strict'

const app = require('../lib/app')

describe('acceptance', function () {
  const agent = global.createAgent(app)
  const sandbox = sinon.createSandbox()
  const context = { agent, sandbox }

  after(function () {
    agent.close()
  })

  afterEach(function () {
    global.verifyAndRestore(sandbox)
  })

  describe('api', function () {
    describe('cloudprofiles', function () {
      require('./acceptance/api.cloudprofiles.spec.js')(context)
    })

    describe('domains', function () {
      require('./acceptance/api.domains.spec.js')(context)
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

  describe('webhook', function () {
    require('./acceptance/webhook.spec.js')(context)
  })
})
