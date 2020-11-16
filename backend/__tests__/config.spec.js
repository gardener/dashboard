//
// SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const gardener = require('../lib/config/gardener')
const { join } = require('path')

const fs = require('fs')

describe('config', function () {
  describe('gardener', function () {
    describe('#getDefaults', function () {
      it('should return the defaults for the test environment', function () {
        const env = { NODE_ENV: 'test' }
        const defaults = gardener.getDefaults({ env })
        expect(defaults).toEqual({
          isProd: false,
          logLevel: 'debug',
          port: 3030
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
      const requiredEnvironmentVariables = {
        API_SERVER_URL: 'apiServerUrl',
        SESSION_SECRET: 'secret', // pragma: whitelist secret
        OIDC_ISSUER: 'issuer',
        OIDC_CLIENT_ID: 'client_id',
        OIDC_CLIENT_SECRET: 'client_secret', // pragma: whitelist secret
        OIDC_REDIRECT_URI: 'redirect_uri'
      }

      it('should return the config in test environment', function () {
        const env = Object.assign({
          NODE_ENV: 'test'
        }, requiredEnvironmentVariables)
        const config = gardener.loadConfig(undefined, { env })
        const defaults = gardener.getDefaults({ env })
        expect(config).toMatchObject(defaults)
      })

      it('should return the config in production environment', function () {
        const env = Object.assign({
          NODE_ENV: 'production'
        }, requiredEnvironmentVariables)

        const filename = '/etc/gardener/1/config.yaml'
        const config = gardener.loadConfig(filename, { env })
        expect(fs.existsSync).toHaveBeenCalledTimes(1)
        expect(fs.readFileSync).toHaveBeenCalledTimes(1)
        expect(fs.readFileSync.mock.calls[0]).toEqual([filename, 'utf8'])
        expect(config.port).toBe(1234)
        expect(config.logLevel).toBe('warn')
      })

      it('should return the config with port and logLevel overridden by environment variables', function () {
        const env = Object.assign({
          NODE_ENV: 'production',
          PORT: '3456',
          LOG_LEVEL: 'error'
        }, requiredEnvironmentVariables)

        const filename = '/etc/gardener/2/config.yaml'
        const config = gardener.loadConfig(filename, { env })
        expect(fs.existsSync).toHaveBeenCalledTimes(1)
        expect(fs.readFileSync).toHaveBeenCalledTimes(1)
        expect(fs.readFileSync.mock.calls[0]).toEqual([filename, 'utf8'])
        expect(config.port).toBe(3456)
        expect(config.logLevel).toBe('error')
      })

      it('should return the config in development environment', function () {
        const env = Object.assign({
          NODE_ENV: 'development'
        }, requiredEnvironmentVariables)

        const filename = gardener.getFilename({ env, argv: [] })
        const config = gardener.loadConfig(filename, { env })
        expect(fs.existsSync).toHaveBeenCalledTimes(1)
        expect(fs.readFileSync).toHaveBeenCalledTimes(1)
        expect(fs.readFileSync.mock.calls[0]).toEqual([filename, 'utf8'])
        expect(config.sessionSecret).toBe(env.SESSION_SECRET)
        expect(config.logLevel).toBe('debug')
      })
    })
  })
})
