//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
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

/*
configMappings defines mappings between config values, their sources (env vars or files),
and destinations in the config object. Properties:
- envVar: The env var to read the value from.
- fsPath: (Optional) File path to read the value from if env var is not set.
- destinationPath: The path in the config object to set the value.
- type: (Optional) 'Boolean', 'Integer', or 'String' (default). Value is converted to this type.

Allows flexible config management from different sources. Values are converted to the desired type.
If both envVar and fsPath are missing/empty, the config path remains unchanged.
*/
const configMappings = [
  {
    envVar: 'VUE_APP_VERSION',
    destinationPath: 'frontend.appVersion'
  },
  {
    envVar: 'SESSION_SECRET',
    fsPath: '/etc/gardener-dashboard/secrets/session/sessionSecret',
    destinationPath: 'sessionSecret'
  },
  {
    envVar: 'API_SERVER_URL',
    destinationPath: 'apiServerUrl'
  },
  {
    envVar: 'OIDC_ISSUER',
    destinationPath: 'oidc.issuer'
  },
  {
    envVar: 'OIDC_CA',
    destinationPath: 'oidc.ca'
  },
  {
    envVar: 'OIDC_CLIENT_ID',
    fsPath: '/etc/gardener-dashboard/secrets/oidc/client_id',
    destinationPath: 'oidc.client_id'
  },
  {
    envVar: 'OIDC_CLIENT_SECRET',
    fsPath: '/etc/gardener-dashboard/secrets/oidc/client_secret',
    destinationPath: 'oidc.client_secret'
  },
  {
    envVar: 'GITHUB_AUTHENTICATION_APP_ID',
    fsPath: '/etc/gardener-dashboard/secrets/github/authentication.appId',
    destinationPath: 'gitHub.authentication.appId',
    type: 'Integer'
  },
  {
    envVar: 'GITHUB_AUTHENTICATION_CLIENT_ID',
    fsPath: '/etc/gardener-dashboard/secrets/github/authentication.clientId',
    destinationPath: 'gitHub.authentication.clientId'
  },
  {
    envVar: 'GITHUB_AUTHENTICATION_CLIENT_SECRET',
    fsPath: '/etc/gardener-dashboard/secrets/github/authentication.clientSecret',
    destinationPath: 'gitHub.authentication.clientSecret'
  },
  {
    envVar: 'GITHUB_AUTHENTICATION_INSTALLATION_ID',
    fsPath: '/etc/gardener-dashboard/secrets/github/authentication.installationId',
    destinationPath: 'gitHub.authentication.installationId',
    type: 'Integer'
  },
  {
    envVar: 'GITHUB_AUTHENTICATION_PRIVATE_KEY',
    fsPath: '/etc/gardener-dashboard/secrets/github/authentication.privateKey',
    destinationPath: 'gitHub.authentication.privateKey'
  },
  {
    envVar: 'GITHUB_AUTHENTICATION_TOKEN',
    fsPath: '/etc/gardener-dashboard/secrets/github/authentication.token',
    destinationPath: 'gitHub.authentication.token'
  },
  {
    envVar: 'GITHUB_WEBHOOK_SECRET',
    fsPath: '/etc/gardener-dashboard/secrets/github/webhookSecret',
    destinationPath: 'gitHub.webhookSecret'
  },
  {
    envVar: 'LOG_LEVEL',
    destinationPath: 'logLevel'
  },
  {
    envVar: 'LOG_HTTP_REQUEST_BODY',
    destinationPath: 'logHttpRequestBody',
    type: 'Boolean'
  },
  {
    envVar: 'PORT',
    destinationPath: 'port',
    type: 'Integer'
  },
  {
    envVar: 'METRICS_PORT',
    destinationPath: 'metricsPort',
    type: 'Integer'
  }
]

function convertValue (value, type) {
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
function getValueFromEnvironment (env, envVar, type) {
  const value = env[envVar]
  return convertValue(value, type)
}

function getValueFromFile (filePath, type) {
  try {
    if (!fs.existsSync(filePath)) {
      return undefined
    }
    const fileContent = fs.readFileSync(filePath, 'utf8')
    return convertValue(fileContent, type)
  } catch (error) {
    /* ignore */
  }
}

function getValueFromEnvironmentOrFile (env, envVar, filePath, type) {
  const value = getValueFromEnvironment(env, envVar, type)
  if (value !== undefined) {
    return value
  }

  if (filePath) {
    return getValueFromFile(filePath, type)
  }
}

module.exports = {
  setConfigFromEnvOrFiles (config, env) {
    for (const { envVar, destinationPath, fsPath, type = 'String' } of configMappings) {
      const value = getValueFromEnvironmentOrFile(env, envVar, fsPath, type)

      if (value !== undefined) {
        _.set(config, destinationPath, value)
      }
    }
  },
  getDefaults ({ env } = process) {
    const isProd = env.NODE_ENV === 'production'
    return {
      isProd,
      logLevel: isProd ? 'warn' : 'debug',
      port: 3030,
      metricsPort: 9050
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
    this.setConfigFromEnvOrFiles(config, env)
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
