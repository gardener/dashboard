//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const assert = require('assert').strict
const _ = require('lodash')
const yaml = require('js-yaml')
const fs = require('fs')
const { homedir } = require('os')
const { join } = require('path')

const environmentVariableDefinitions = {
  SESSION_SECRET: 'sessionSecret', // pragma: whitelist secret
  API_SERVER_URL: 'apiServerUrl',
  OIDC_ISSUER: 'oidc.issuer',
  OIDC_CLIENT_ID: 'oidc.client_id',
  OIDC_CLIENT_SECRET: 'oidc.client_secret', // pragma: whitelist secret
  OIDC_CA: 'oidc.ca',
  GITHUB_AUTHENTICATION_USERNAME: 'gitHub.authentication.username',
  GITHUB_AUTHENTICATION_TOKEN: 'gitHub.authentication.token',
  GITHUB_WEBHOOK_SECRET: 'gitHub.webhookSecret', // pragma: whitelist secret
  LOG_LEVEL: 'logLevel',
  LOG_HTTP_REQUEST_BODY: {
    type: 'Boolean',
    path: 'logHttpRequestBody'
  },
  PORT: {
    type: 'Integer',
    path: 'port'
  }
}

function getEnvironmentVariable (env, name, type) {
  let value = env[name]
  switch (type) {
    case 'Integer':
      value = parseInt(value, 10)
      return Number.isInteger(value) ? value : undefined
    case 'Boolean':
      return value === 'true'
    default:
      return value
  }
}

module.exports = {
  assignEnvironmentVariables (config, env) {
    _.forEach(environmentVariableDefinitions, (path, name) => {
      let type = 'String'
      if (_.isPlainObject(path)) {
        type = path.type
        path = path.path
      }
      const value = getEnvironmentVariable(env, name, type)
      if (value) {
        _.set(config, path, value)
      }
    })
  },
  getDefaults ({ env } = process) {
    const isProd = env.NODE_ENV === 'production'
    return {
      isProd,
      logLevel: isProd ? 'warn' : 'debug',
      port: 3030
    }
  },
  getFilename ({ argv, env } = process) {
    if (env.GARDENER_CONFIG) {
      return env.GARDENER_CONFIG
    }
    if (argv[2] && env.NODE_ENV !== 'test') {
      return argv[2]
    }
    return join(homedir(), '.gardener', 'config.yaml')
  },
  loadConfig (filename, { env } = process) {
    const config = this.getDefaults({ env })
    if (filename) {
      try {
        _.merge(config, this.readConfig(filename))
      } catch (err) { /* ignore */ }
    }
    this.assignEnvironmentVariables(config, env)
    const requiredConfigurationProperties = [
      'sessionSecret',
      'apiServerUrl'
    ]

    // When OIDC is configured, some more configuration is required
    if (config.oidc) {
      const redirectUri = _.get(config, 'oidc.redirect_uri')
      const redirectUris = _.get(config, 'oidc.redirect_uris')
      if (redirectUri && _.isEmpty(redirectUris)) {
        _.set(config, 'oidc.redirect_uris', [redirectUri])
      }
      requiredConfigurationProperties.push(
        'oidc.issuer',
        'oidc.client_id',
        'oidc.redirect_uris'
      )
    }

    _.forEach(requiredConfigurationProperties, path => {
      assert.ok(_.get(config, path), `Configuration value '${path}' is required`)
    })

    _.set(config, 'frontend.primaryLoginType', config.oidc ? 'oidc' : 'token')
    _.set(config, 'frontend.apiServerUrl', config.apiServerUrl)
    _.set(config, 'frontend.clusterIdentity', config.clusterIdentity)
    if (!config.gitHub && _.has(config, 'frontend.ticket')) {
      _.unset(config, 'frontend.ticket')
    }

    return config
  },
  readConfig (path) {
    return yaml.load(fs.readFileSync(path, 'utf8'))
  }
}
