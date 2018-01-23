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

const config = require('../lib/config')
const gardener = require('../lib/config/gardener')

describe('config', function () {
  /* eslint no-unused-expressions: 0 */

  it('should have loaded the default gardener configuration for test environment', function () {
    const env = {NODE_ENV: 'test'}
    const defaults = gardener.getDefaults({env})
    expect(config).to.eql(defaults)
  })

  describe('gardener', function () {
    describe('#getFilename', function () {
      it('should return no filename in test environment', function () {
        const env = {NODE_ENV: 'test'}
        const filename = gardener.getFilename({env})
        expect(filename).to.be.undefined
      })
      it('should return the filename from GARDENER_CONFIG environment variable', function () {
        const GARDENER_CONFIG = '.gardener/config.yaml'
        const env = {GARDENER_CONFIG}
        const filename = gardener.getFilename({env})
        expect(filename).to.equal(GARDENER_CONFIG)
      })
      it('should return the filename from command line arguments', function () {
        const env = {}
        const argv = ['node', 'bar', '.gardener/config.yaml']
        const filename = gardener.getFilename({env, argv})
        expect(filename).to.equal(argv[2])
      })
      it('should return the default filename in the users homedir', function () {
        const env = {}
        const argv = ['node', 'bar']
        const filename = gardener.getFilename({env, argv})
        expect(filename).to.include('/.gardener/config.yaml')
      })
    })

    describe('#loadConfig', function () {
      const sandbox = sinon.sandbox.create()

      afterEach(function () {
        sandbox.restore()
      })

      it('should return the config in test environment', function () {
        const env = {NODE_ENV: 'test'}
        const config = gardener.loadConfig(undefined, {env})
        const defaults = gardener.getDefaults({env})
        expect(config).to.eql(defaults)
      })

      it('should return the config in production environment', function () {
        const env = {NODE_ENV: 'production'}
        const filename = 'filename'
        const fileData = 'port: 1234'
        const existsSyncStub = sandbox.stub(gardener, 'existsSync')
        existsSyncStub.withArgs(filename).returns(true)
        const readFileSyncStub = sandbox.stub(gardener, 'readFileSync')
        readFileSyncStub.withArgs(filename, 'utf8').returns(fileData)
        const config = gardener.loadConfig(filename, {env})
        expect(config.port).to.equal(1234)
        expect(config.logLevel).to.equal('warn')
      })

      it('should return the config in development environment', function () {
        const env = {NODE_ENV: 'development'}
        const filename = 'filename'
        const fileData = 'jwks:\n  cache: true'
        const existsSyncStub = sandbox.stub(gardener, 'existsSync')
        existsSyncStub.withArgs(filename).returns(true)
        const readFileSyncStub = sandbox.stub(gardener, 'readFileSync')
        readFileSyncStub.withArgs(filename, 'utf8').returns(fileData)
        const config = gardener.loadConfig(filename, {env})
        expect(config.jwks.cache).to.be.true
        expect(config.logLevel).to.equal('debug')
      })
    })
  })
})
