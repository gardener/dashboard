//
// Copyright (c) 2019 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file
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

const { HTTPError } = require('got')
const { healthCheck } = require('../lib/healthz')
const { dashboardClient } = require('../lib/kubernetes-client')

describe('healthz', function () {
  /* eslint no-unused-expressions: 0 */
  const sandbox = sinon.createSandbox()
  const healthz = dashboardClient.healthz
  let getHealthzStub

  beforeEach(function () {
    getHealthzStub = sandbox.stub(healthz, 'get')
  })

  afterEach(function () {
    sandbox.restore()
  })

  it('should successfully check health', async function () {
    await healthCheck()
    expect(getHealthzStub).to.be.calledOnce
  })

  it('should throw a HTTP Error', async function () {
    getHealthzStub.throws(new HTTPError({ body: 'body', statusCode: 500 }))
    try {
      await healthCheck()
    } catch (err) {
      expect(err.message).to.match(/^Kubernetes apiserver is not healthy/)
      expect(err.message).to.match(/(Status code: 500)/)
    }
    expect(getHealthzStub).to.be.calledOnce
  })

  it('should throw an Error', async function () {
    getHealthzStub.throws(new Error('Failed'))
    try {
      await healthCheck()
    } catch (err) {
      expect(err.message).to.match(/^Could not reach Kubernetes apiserver/)
    }
    expect(getHealthzStub).to.be.calledOnce
  })
})
