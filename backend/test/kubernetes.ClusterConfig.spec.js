//
// Copyright 2018 by The Gardener Authors.
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

const ClusterConfig = require('../lib/kubernetes/ClusterConfig')

describe('kubernetes', function () {
  /* eslint no-unused-expressions: 0 */

  describe('ClusterConfig', function () {
    const sandbox = sinon.sandbox.create()
    const url = 'url'
    const ca = 'ca'
    const cert = 'cert'
    const key = 'key'
    const bearer = 'bearer'
    const auth = {bearer}
    const namespace = 'namespace'

    afterEach(function () {
      sandbox.restore()
    })

    describe('#constructor', function () {
      it('should create cluster config with all properties', function () {
        const insecureSkipTlsVerify = true
        const config = new ClusterConfig({url, ca, cert, key, auth, namespace, insecureSkipTlsVerify})
        expect(config.url).to.equal(url)
        expect(config.ca).to.equal(ca)
        expect(config.cert).to.equal(cert)
        expect(config.key).to.equal(key)
        expect(config.ca).to.equal(ca)
        expect(config.auth).to.equal(auth)
        expect(config.namespace).to.equal(namespace)
        expect(config.insecureSkipTlsVerify).to.equal(insecureSkipTlsVerify)
      })
    })

    describe('#inCluster', function () {
      const SERVICE_HOST = 'localhost'
      const SERVICE_PORT = '1234'

      it('should return that in cluster config is possible', function () {
        sandbox.stub(ClusterConfig, 'SERVICE_HOST').value(SERVICE_HOST)
        sandbox.stub(ClusterConfig, 'SERVICE_PORT').value(SERVICE_PORT)
        const existsSyncStub = sandbox.stub(ClusterConfig, 'existsSync')
        existsSyncStub.withArgs(ClusterConfig.TOKEN_PATH).returns(true)
        const possible = ClusterConfig.inClusterPossible()
        expect(existsSyncStub).to.have.callCount(1)
        expect(possible).to.be.true
      })

      it('should fail to create cluster config', function () {
        try {
          ClusterConfig.inCluster()
        } catch (err) {
          return expect(err).to.be.instanceof(TypeError)
        }
        expect.fail('Create cluster config succeeded unexpectedly')
      })

      it('should return in cluster config', function () {
        sandbox.stub(ClusterConfig, 'SERVICE_HOST').value(SERVICE_HOST)
        sandbox.stub(ClusterConfig, 'SERVICE_PORT').value(SERVICE_PORT)
        const readFileSyncStub = sandbox.stub(ClusterConfig, 'readFileSync')
        readFileSyncStub.withArgs(ClusterConfig.TOKEN_PATH, 'utf8').returns(bearer)
        readFileSyncStub.withArgs(ClusterConfig.CA_PATH, 'utf8').returns(ca)
        readFileSyncStub.withArgs(ClusterConfig.NAMESPACE_PATH, 'utf8').returns(namespace)
        const config = ClusterConfig.inCluster()
        expect(readFileSyncStub).to.have.callCount(3)
        expect(config.url).to.be.equal(`https://${SERVICE_HOST}:${SERVICE_PORT}`)
        expect(config.ca).to.be.equal(ca)
        expect(config.namespace).to.be.equal(namespace)
        expect(config.auth).to.be.eql({bearer})
        expect(config.insecureSkipTlsVerify).to.be.false
      })
    })
  })
})
