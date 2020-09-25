//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const gardener = require('../lib/config/gardener')
const path = require('path')
const testConfigPath = path.resolve(__dirname, '../lib/config/test.yaml')

describe('config', function () {
  /* eslint no-unused-expressions: 0 */
  describe('gardener', function () {
    describe('#getDefaults', function () {
      it('should return the defaults for the test environment', function () {
        const env = { NODE_ENV: 'test' }
        const defaults = gardener.getDefaults({ env })
        expect(defaults).to.eql({
          isProd: false,
          logLevel: 'debug',
          port: 3030
        })
      })
    })
    describe('#getFilename', function () {
      it('should return no filename in test environment', function () {
        const env = { NODE_ENV: 'test' }
        const filename = gardener.getFilename({ env })
        expect(filename).to.equal(testConfigPath)
      })
      it('should return the filename from GARDENER_CONFIG environment variable', function () {
        const GARDENER_CONFIG = '.gardener/config.yaml'
        const env = { GARDENER_CONFIG }
        const filename = gardener.getFilename({ env })
        expect(filename).to.equal(GARDENER_CONFIG)
      })
      it('should return the filename from command line arguments', function () {
        const env = {}
        const argv = ['node', 'bar', '.gardener/config.yaml']
        const filename = gardener.getFilename({ env, argv })
        expect(filename).to.equal(argv[2])
      })
      it('should return the default filename in the users homedir', function () {
        const env = {}
        const argv = ['node', 'bar']
        const filename = gardener.getFilename({ env, argv })
        expect(filename).to.include('/.gardener/config.yaml')
      })
    })

    describe('#loadConfig', function () {
      const sandbox = sinon.createSandbox()
      const requiredEnvironmentVariables = {
        API_SERVER_URL: 'apiServerUrl',
        SESSION_SECRET: 'secret', // pragma: whitelist secret
        OIDC_ISSUER: 'issuer',
        OIDC_CLIENT_ID: 'client_id',
        OIDC_CLIENT_SECRET: 'client_secret', // pragma: whitelist secret
        OIDC_REDIRECT_URI: 'redirect_uri'
      }

      afterEach(function () {
        sandbox.restore()
      })

      it('should return the config in test environment', function () {
        const env = Object.assign({
          NODE_ENV: 'test'
        }, requiredEnvironmentVariables)
        const config = gardener.loadConfig(undefined, { env })
        const defaults = gardener.getDefaults({ env })
        expect(config).to.include(defaults)
      })

      it('should return the config in production environment', function () {
        const env = Object.assign({
          NODE_ENV: 'production'
        }, requiredEnvironmentVariables)

        const filename = 'filename'
        const fileData = 'port: 1234'
        const existsSyncStub = sandbox.stub(gardener, 'existsSync')
        existsSyncStub.withArgs(filename).returns(true)
        const readFileSyncStub = sandbox.stub(gardener, 'readFileSync')
        readFileSyncStub.withArgs(filename, 'utf8').returns(fileData)
        const config = gardener.loadConfig(filename, { env })
        expect(config.port).to.equal(1234)
        expect(config.logLevel).to.equal('warn')
      })

      it('should return the config with port and logLevel overridden by environment variables', function () {
        const env = Object.assign({
          NODE_ENV: 'production',
          PORT: '3456',
          LOG_LEVEL: 'error'
        }, requiredEnvironmentVariables)

        const filename = 'filename'
        const fileData = 'port: 1234\nlogLevel: info'
        const existsSyncStub = sandbox.stub(gardener, 'existsSync')
        existsSyncStub.withArgs(filename).returns(true)
        const readFileSyncStub = sandbox.stub(gardener, 'readFileSync')
        readFileSyncStub.withArgs(filename, 'utf8').returns(fileData)
        const config = gardener.loadConfig(filename, { env })
        expect(config.port).to.equal(3456)
        expect(config.logLevel).to.equal('error')
      })

      it('should return the config in development environment', function () {
        const env = Object.assign({
          NODE_ENV: 'development'
        }, requiredEnvironmentVariables)

        const filename = 'filename'
        const fileData = 'sessionSecret: ~'
        const existsSyncStub = sandbox.stub(gardener, 'existsSync')
        existsSyncStub.withArgs(filename).returns(true)
        const readFileSyncStub = sandbox.stub(gardener, 'readFileSync')
        readFileSyncStub.withArgs(filename, 'utf8').returns(fileData)
        const config = gardener.loadConfig(filename, { env })
        expect(config.sessionSecret).to.equal(env.SESSION_SECRET)
        expect(config.logLevel).to.equal('debug')
      })
    })
  })
})
