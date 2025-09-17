//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const fs = require('fs')
const gardener = require('../dist/lib/config/gardener')

describe('config', function () {
  describe('gardener', function () {
    describe('#readConfig', function () {
      const originalGardener = jest.requireActual('../dist/lib/config/gardener')

      const path = 'path'
      let readFileSyncStub

      beforeEach(() => {
        readFileSyncStub = jest.spyOn(fs, 'readFileSync').mockReturnValueOnce('port: 1234')
      })

      afterEach(() => {
        readFileSyncStub.mockRestore()
      })

      it('should return the defaults for the test environment', function () {
        expect(originalGardener.readConfig(path)).toEqual({ port: 1234 })
        expect(readFileSyncStub).toHaveBeenCalledTimes(1)
        expect(readFileSyncStub.mock.calls[0]).toEqual([path, 'utf8'])
      })
    })

    describe('#getDefaults', function () {
      it('should return the defaults for the test environment', function () {
        const env = { NODE_ENV: 'test' }
        const defaults = gardener.getDefaults({ env })
        expect(defaults).toEqual({
          isProd: false,
          logLevel: 'debug',
          port: 3030,
          metricsPort: 9050,
        })
      })
    })

    describe('#getFilename', function () {
      it('should return the filename from GARDENER_CONFIG environment variable', function () {
        const GARDENER_CONFIG = '.gardener/config.yaml'
        const env = { GARDENER_CONFIG }
        const filename = gardener.getFilename({ env })
        expect(filename).toBe(GARDENER_CONFIG)
      })

      it('should return the filename from command line arguments', function () {
        const env = {}
        const argv = ['node', 'bar', '.gardener/config.yaml']
        const filename = gardener.getFilename({ env, argv })
        expect(filename).toBe(argv[2])
      })

      it('should return the default filename in the users homedir', function () {
        const env = {}
        const argv = ['node', 'bar']
        const filename = gardener.getFilename({ env, argv })
        expect(filename).toMatch(/\/\.gardener\/config\.yaml$/)
      })
    })

    describe('#loadConfig', function () {
      const environmentVariables = {
        API_SERVER_URL: 'apiServerUrl',
        SESSION_SECRET: 'secret',
        WEBSOCKET_ALLOWED_ORIGINS: 'https://foo.example.org,https://bar.example.org',
      }

      let readFileSyncSpy

      beforeEach(() => {
        readFileSyncSpy = jest.spyOn(fs, 'readFileSync')
      })

      afterEach(() => {
        gardener.readConfig.mockClear()
        readFileSyncSpy.mockRestore()
      })

      it('should return the config in test environment without config file', function () {
        const env = Object.assign({
          NODE_ENV: 'test',
        }, environmentVariables)

        const config = gardener.loadConfig(undefined, { env })
        const defaults = gardener.getDefaults({ env })
        expect(config).toMatchObject(defaults)
        expect(config.logLevel).toBe('debug')
      })

      it('should set default loglevel production environment', function () {
        const env = Object.assign({
          NODE_ENV: 'production',
        }, environmentVariables)

        const config = gardener.loadConfig(undefined, { env })
        expect(config.logLevel).toBe('warn')
      })

      it('should return the config with values read from the filesystem', function () {
        const env = {}
        const fileMap = {
          '/etc/gardener-dashboard/secrets/oidc/client_id': 'client_id_from_file',
          '/etc/gardener-dashboard/secrets/oidc/client_secret': 'client_secret_from_file',
          '/etc/gardener-dashboard/secrets/github/authentication.appId': '12345',
          '/etc/gardener-dashboard/secrets/github/authentication.installationId': '67890',
        }

        readFileSyncSpy.mockImplementation(filePath => {
          if (filePath in fileMap) {
            return fileMap[filePath]
          }
          throw new Error(filePath + ': not found')
        })

        const filename = '/etc/gardener/config.yaml'
        const config = gardener.loadConfig(filename, { env })

        expect(config.oidc.issuer).toBe('https://kubernetes:32001')
        expect(config.oidc.client_id).toBe('client_id_from_file')
        expect(config.oidc.client_secret).toBe('client_secret_from_file')
        expect(config.gitHub.authentication.appId).toBe(12345)
        expect(config.gitHub.authentication.installationId).toBe(67890)
        expect(config.websocketAllowedOrigins).toEqual(['*'])
        expect(config.logLevel).toBe('info')
      })

      it('should return the config overridden by environment variables', function () {
        const env = Object.assign({
          NODE_ENV: 'production',
          PORT: '3456',
          LOG_LEVEL: 'error',
          OIDC_CLIENT_ID: 'client_id',
          OIDC_CLIENT_SECRET: 'client_secret',
          OIDC_CA: 'ca',
        }, environmentVariables)

        const filename = '/etc/gardener/config.yaml'
        const config = gardener.loadConfig(filename, { env })
        expect(gardener.readConfig).toHaveBeenCalledTimes(1)
        expect(gardener.readConfig.mock.calls[0]).toEqual([filename])

        // local env
        expect(config.port).toBe(parseInt(env.PORT))
        expect(config.logLevel).toBe(env.LOG_LEVEL)
        expect(config.oidc.client_id).toBe(env.OIDC_CLIENT_ID)
        expect(config.oidc.client_secret).toBe(env.OIDC_CLIENT_SECRET)
        expect(config.oidc.ca).toBe(env.OIDC_CA)

        // global env
        expect(config.apiServerUrl).toBe(env.API_SERVER_URL)
        expect(config.sessionSecret).toBe(env.SESSION_SECRET)
        expect(config.websocketAllowedOrigins).toEqual(env.WEBSOCKET_ALLOWED_ORIGINS.split(','))
      })
    })
  })
})
