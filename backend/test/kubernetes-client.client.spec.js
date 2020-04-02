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
const { createClient } = require('../lib/kubernetes-client')

describe('kubernetes-client', function () {
  /* eslint no-unused-expressions: 0 */

  const sandbox = sinon.createSandbox()

  afterEach(function () {
    sandbox.restore()
  })

  describe('Client', function () {
    const bearer = 'bearer'
    const namespace = 'namespace'
    const name = 'name'

    let testClient
    let getSecretStub

    beforeEach(function () {
      testClient = createClient({ auth: { bearer } })
      getSecretStub = sandbox.stub(testClient.core.secrets, 'get')
    })

    it('should create a client', function () {
      expect(testClient.constructor.name).to.equal('Client')
      expect(testClient.cluster.server.hostname).to.equal('kubernetes')
    })

    it('should read a kubeconfig from a secret', async function () {
      getSecretStub.returns({
        data: {
          kubeconfig: Buffer.from('foo').toString('base64')
        }
      })
      const kubeconfig = await testClient.getKubeconfig({ namespace, name })
      expect(getSecretStub).to.be.calledOnceWith(namespace, name)
      expect(kubeconfig).to.equal('foo')
    })

    it('should not find a kubeconfig in the secret', async function () {
      getSecretStub.returns({
        data: {}
      })
      try {
        await testClient.getKubeconfig({ namespace, name })
        expect.fail('expected "getKubeconfig" to throw not found')
      } catch (err) {
        expect(err).to.be.instanceof(HTTPError)
        expect(err.response.statusCode).to.equal(404)
      }
    })
  })
})
