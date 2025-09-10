//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import assert from 'assert'
import _ from 'lodash-es'
import { load } from 'js-yaml'
import fs from 'fs'
import { homedir } from 'os'
import { join } from 'path'

/*
configMappings defines mappings between config values, their sources (environment variables or files),
and destinations in the config object. Properties:
- environmentVariableName: The environment variable to read the value from.
- filePath: (Optional) File path to read the value from if environment variable is not set.
- configPath: The path in the config object to set the value.
- type: (Optional) 'Boolean', 'Integer', or 'String' (default). Value is converted to this type.

Allows flexible config management from different sources. Values are converted to the desired type.
If both environmentVariableName and filePath are missing/empty, the config path remains unchanged.
*/
const configMappings = [
  {
    environmentVariableName: 'VUE_APP_VERSION',
    configPath: 'frontend.appVersion',
  },
  {
    environmentVariableName: 'SESSION_SECRET',
    filePath: '/etc/gardener-dashboard/secrets/session/sessionSecret',
    configPath: 'sessionSecret',
  },
  {
    environmentVariableName: 'SESSION_SECRET_PREVIOUS',
    filePath: '/etc/gardener-dashboard/secrets/session/sessionSecretPrevious',
    configPath: 'sessionSecretPrevious',
  },
  {
    environmentVariableName: 'API_SERVER_URL',
    configPath: 'apiServerUrl',
  },
  {
    environmentVariableName: 'OIDC_ISSUER',
    configPath: 'oidc.issuer',
  },
  {
    environmentVariableName: 'OIDC_CA',
    configPath: 'oidc.ca',
  },
  {
    environmentVariableName: 'OIDC_CLIENT_ID',
    filePath: '/etc/gardener-dashboard/secrets/oidc/client_id',
    configPath: 'oidc.client_id',
  },
  {
    environmentVariableName: 'OIDC_CLIENT_SECRET',
    filePath: '/etc/gardener-dashboard/secrets/oidc/client_secret',
    configPath: 'oidc.client_secret',
  },
  {
    environmentVariableName: 'GITHUB_AUTHENTICATION_APP_ID',
    filePath: '/etc/gardener-dashboard/secrets/github/authentication.appId',
    configPath: 'gitHub.authentication.appId',
    type: 'Integer',
  },
  {
    environmentVariableName: 'GITHUB_AUTHENTICATION_CLIENT_ID',
    filePath: '/etc/gardener-dashboard/secrets/github/authentication.clientId',
    configPath: 'gitHub.authentication.clientId',
  },
  {
    environmentVariableName: 'GITHUB_AUTHENTICATION_CLIENT_SECRET',
    filePath: '/etc/gardener-dashboard/secrets/github/authentication.clientSecret',
    configPath: 'gitHub.authentication.clientSecret',
  },
  {
    environmentVariableName: 'GITHUB_AUTHENTICATION_INSTALLATION_ID',
    filePath: '/etc/gardener-dashboard/secrets/github/authentication.installationId',
    configPath: 'gitHub.authentication.installationId',
    type: 'Integer',
  },
  {
    environmentVariableName: 'GITHUB_AUTHENTICATION_PRIVATE_KEY',
    filePath: '/etc/gardener-dashboard/secrets/github/authentication.privateKey',
    configPath: 'gitHub.authentication.privateKey',
  },
  {
    environmentVariableName: 'GITHUB_AUTHENTICATION_TOKEN',
    filePath: '/etc/gardener-dashboard/secrets/github/authentication.token',
    configPath: 'gitHub.authentication.token',
  },
  {
    environmentVariableName: 'GITHUB_WEBHOOK_SECRET',
    filePath: '/etc/gardener-dashboard/secrets/github/webhookSecret',
    configPath: 'gitHub.webhookSecret',
  },
  {
    environmentVariableName: 'LOG_LEVEL',
    configPath: 'logLevel',
  },
  {
    environmentVariableName: 'LOG_HTTP_REQUEST_BODY',
    configPath: 'logHttpRequestBody',
    type: 'Boolean',
  },
  {
    environmentVariableName: 'PORT',
    configPath: 'port',
    type: 'Integer',
  },
  {
    environmentVariableName: 'METRICS_PORT',
    configPath: 'metricsPort',
    type: 'Integer',
  },
  {
    environmentVariableName: 'WEBSOCKET_ALLOWED_ORIGINS',
    configPath: 'websocketAllowedOrigins',
    type: 'Array',
  },
]

function parseConfigValue (value, type) {
  switch (type) {
    case 'Integer':
      value = parseInt(value, 10)
      return Number.isInteger(value) ? value : undefined
    case 'Boolean':
      return value === 'true'
    case 'Array':
      return value ? value.split(',').map(v => v.trim()).filter(Boolean) : undefined
    default:
      return value
  }
}

export default {
  assignConfigFromEnvironmentAndFileSystem (config, env) {
    for (const configMapping of configMappings) {
      const {
        environmentVariableName,
        configPath,
        filePath,
        type = 'String',
      } = configMapping
      let rawValue = env[environmentVariableName] // eslint-disable-line security/detect-object-injection
      if (!rawValue && filePath) {
        try {
          rawValue = fs.readFileSync(filePath, 'utf8') // eslint-disable-line security/detect-non-literal-fs-filename
        } catch (err) { /* ignore error */ }
      }
      const value = parseConfigValue(rawValue, type)

      if (value !== undefined) {
        _.set(config, configPath, value)
      }
    }
  },
  getDefaults ({ env } = process) {
    const isProd = env.NODE_ENV === 'production'
    return {
      isProd,
      logLevel: isProd ? 'warn' : 'debug',
      port: 3030,
      metricsPort: 9050,
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
    this.assignConfigFromEnvironmentAndFileSystem(config, env)
    const requiredConfigurationProperties = [
      'sessionSecret',
      'apiServerUrl',
      'websocketAllowedOrigins',
    ]

    // When OIDC is configured, some more configuration is required
    if (config.oidc) {
      const redirectUri = _.get(config, ['oidc', 'redirect_uri'])
      const redirectUris = _.get(config, ['oidc', 'redirect_uris'])
      if (redirectUri && _.isEmpty(redirectUris)) {
        _.set(config, ['oidc', 'redirect_uris'], [redirectUri])
      }
      requiredConfigurationProperties.push(
        'oidc.issuer',
        'oidc.client_id',
        'oidc.redirect_uris',
      )
    }

    _.forEach(requiredConfigurationProperties, path => {
      assert.ok(_.get(config, path), `Configuration value '${path}' is required`)
    })

    const sessionSecrets = [config.sessionSecret]
    if (config.sessionSecretPrevious) {
      sessionSecrets.push(config.sessionSecretPrevious)
    }
    _.set(config, ['sessionSecrets'], sessionSecrets)
    _.set(config, ['frontend', 'apiServerUrl'], config.apiServerUrl)
    _.set(config, ['frontend', 'clusterIdentity'], config.clusterIdentity)
    _.set(config, ['frontend', 'unreachableSeeds', 'matchLabels'], config.unreachableSeeds?.matchLabels)
    if (!config.gitHub && _.has(config, ['frontend', 'ticket'])) {
      _.unset(config, ['frontend', 'ticket'])
    }

    return config
  },
  readConfig (path) {
    const data = fs.readFileSync(path, 'utf8') // eslint-disable-line security/detect-non-literal-fs-filename
    return load(data)
  },
}
