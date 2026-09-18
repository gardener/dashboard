//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import assert from 'assert'
import _ from 'lodash-es'
import { load as yamlLoad } from 'js-yaml'
import fs from 'fs'
import { homedir } from 'os'
import { join } from 'path'

/*
configMappings defines mappings between config values, their sources (environment variables or files),
and destinations in the config object. Properties:
- environmentVariableName: The environment variable to read the value from.
- filePath: (Optional) File path to read the value from if environment variable is not set.
- fileFallbackWhen: (Optional) Predicate that controls whether the file fallback applies. Defaults to allowing the fallback.
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
    fileFallbackWhen: config => Boolean(config.oidc?.issuer),
    configPath: 'oidc.client_id',
  },
  {
    environmentVariableName: 'OIDC_CLIENT_SECRET',
    filePath: '/etc/gardener-dashboard/secrets/oidc/client_secret',
    fileFallbackWhen: config => Boolean(config.oidc?.issuer),
    configPath: 'oidc.client_secret',
  },
  {
    environmentVariableName: 'GITHUB_AUTHENTICATION_APP_ID',
    filePath: '/etc/gardener-dashboard/secrets/github/authentication.appId',
    fileFallbackWhen: config => Boolean(config.gitHub),
    configPath: 'gitHub.authentication.appId',
    type: 'Integer',
  },
  {
    environmentVariableName: 'GITHUB_AUTHENTICATION_CLIENT_ID',
    filePath: '/etc/gardener-dashboard/secrets/github/authentication.clientId',
    fileFallbackWhen: config => Boolean(config.gitHub),
    configPath: 'gitHub.authentication.clientId',
  },
  {
    environmentVariableName: 'GITHUB_AUTHENTICATION_CLIENT_SECRET',
    filePath: '/etc/gardener-dashboard/secrets/github/authentication.clientSecret',
    fileFallbackWhen: config => Boolean(config.gitHub),
    configPath: 'gitHub.authentication.clientSecret',
  },
  {
    environmentVariableName: 'GITHUB_AUTHENTICATION_INSTALLATION_ID',
    filePath: '/etc/gardener-dashboard/secrets/github/authentication.installationId',
    fileFallbackWhen: config => Boolean(config.gitHub),
    configPath: 'gitHub.authentication.installationId',
    type: 'Integer',
  },
  {
    environmentVariableName: 'GITHUB_AUTHENTICATION_PRIVATE_KEY',
    filePath: '/etc/gardener-dashboard/secrets/github/authentication.privateKey',
    fileFallbackWhen: config => Boolean(config.gitHub),
    configPath: 'gitHub.authentication.privateKey',
  },
  {
    environmentVariableName: 'GITHUB_AUTHENTICATION_TOKEN',
    filePath: '/etc/gardener-dashboard/secrets/github/authentication.token',
    fileFallbackWhen: config => Boolean(config.gitHub),
    configPath: 'gitHub.authentication.token',
  },
  {
    environmentVariableName: 'GITHUB_WEBHOOK_SECRET',
    filePath: '/etc/gardener-dashboard/secrets/github/webhookSecret',
    fileFallbackWhen: config => Boolean(config.gitHub),
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
  // Also used for metrics unless metricsHost is configured separately. If omitted,
  // Node.js binds to :: when IPv6 is available, otherwise 0.0.0.0.
  {
    environmentVariableName: 'BIND_HOST',
    configPath: 'host',
  },
  {
    environmentVariableName: 'METRICS_PORT',
    configPath: 'metricsPort',
    type: 'Integer',
  },
  // If omitted, inherits host. If both are omitted, Node.js uses its default bind behavior.
  {
    environmentVariableName: 'METRICS_BIND_HOST',
    configPath: 'metricsHost',
  },
  {
    environmentVariableName: 'WEBSOCKET_ALLOWED_ORIGINS',
    configPath: 'websocketAllowedOrigins',
    type: 'Array',
  },
]

const MOST_RECENT_PAGINATED = 'mostRecentPaginated'
const dashboardReflectorResources = [
  ['core.gardener.cloud', 'cloudprofiles'],
  ['core.gardener.cloud', 'controllerregistrations'],
  ['core.gardener.cloud', 'projects'],
  ['core.gardener.cloud', 'quotas'],
  ['core.gardener.cloud', 'seeds'],
  ['core.gardener.cloud', 'shoots'],
  ['seedmanagement.gardener.cloud', 'managedseeds'],
  ['', 'resourcequotas'],
]

function reflectorResourceKey (apiGroup, resource) {
  return `${apiGroup ?? ''}/${resource}`
}

function validateReflectorConfig (config) {
  const { kubeClient } = config
  if (kubeClient === undefined) {
    return
  }
  if (!_.isPlainObject(kubeClient)) {
    assert.fail("Configuration value 'kubeClient' must be an object")
  }
  const { reflector } = kubeClient
  if (reflector === undefined) {
    return
  }
  if (!_.isPlainObject(reflector)) {
    assert.fail("Configuration value 'kubeClient.reflector' must be an object")
  }
  const unsupportedReflectorProperty = Object.keys(reflector).find(key => key !== 'resources')
  if (unsupportedReflectorProperty) {
    assert.fail(`Configuration value 'kubeClient.reflector.${unsupportedReflectorProperty}' is not supported`)
  }
  const { resources } = reflector
  if (resources === undefined) {
    return
  }
  if (!Array.isArray(resources)) {
    assert.fail("Configuration value 'kubeClient.reflector.resources' must be an array")
  }

  const activeResources = new Set(dashboardReflectorResources.map(resource => reflectorResourceKey(...resource)))
  if (config.gitHub?.webhookSecret) {
    activeResources.add(reflectorResourceKey('coordination.k8s.io', 'leases'))
  }
  const configuredResources = new Set()
  resources.forEach((entry, index) => {
    const path = `kubeClient.reflector.resources[${index}]`
    if (!_.isPlainObject(entry)) {
      assert.fail(`Configuration value '${path}' must be an object`)
    }
    const unsupportedEntryProperty = Object.keys(entry).find(key => !['apiGroup', 'resource', 'strategy', 'pageSize'].includes(key))
    if (unsupportedEntryProperty) {
      assert.fail(`Configuration value '${path}.${unsupportedEntryProperty}' is not supported`)
    }

    const { apiGroup, resource, strategy, pageSize } = entry
    if (apiGroup !== undefined && (typeof apiGroup !== 'string' || !apiGroup)) {
      assert.fail(`Configuration value '${path}.apiGroup' must be a non-empty string`)
    }
    if (typeof resource !== 'string' || !resource) {
      assert.fail(`Configuration value '${path}.resource' must be a non-empty string`)
    }
    if (strategy !== MOST_RECENT_PAGINATED) {
      assert.fail(`Configuration value '${path}.strategy' must be '${MOST_RECENT_PAGINATED}'`)
    }
    if (!Number.isSafeInteger(pageSize) || pageSize <= 0) {
      assert.fail(`Configuration value '${path}.pageSize' must be a positive safe integer`)
    }

    const resourceKey = reflectorResourceKey(apiGroup, resource)
    if (configuredResources.has(resourceKey)) {
      assert.fail(`Configuration value 'kubeClient.reflector.resources' contains duplicate entry '${resourceKey}'`)
    }
    configuredResources.add(resourceKey)
    if (!activeResources.has(resourceKey)) {
      assert.fail(`Configuration value '${path}' refers to resource '${resourceKey}' without an active Dashboard informer`)
    }
  })
}

function assignReflectorResourcesFromEnvironment (config, env) {
  const value = env.KUBE_CLIENT_REFLECTOR_RESOURCES
  if (value === undefined || value === '') {
    return
  }
  try {
    _.set(config, ['kubeClient', 'reflector', 'resources'], JSON.parse(value))
  } catch (err) {
    assert.fail(`Environment variable 'KUBE_CLIENT_REFLECTOR_RESOURCES' must contain valid JSON: ${err.message}`)
  }
}

function parseConfigValue (value, type) {
  const parseArray = value => {
    if (value == null || typeof value !== 'string' || value.length === 0) {
      return undefined
    }
    const arr = value.split(',').map(v => v.trim()).filter(Boolean)
    return arr.length > 0 ? arr : undefined
  }
  switch (type) {
    case 'Integer':
      value = parseInt(value, 10)
      return Number.isInteger(value) ? value : undefined
    case 'Boolean':
      return value === 'true'
    case 'Array':
      return parseArray(value)
    default:
      return value
  }
}

function assignConfigValue (config, { configPath, type = 'String' }, rawValue) {
  const value = parseConfigValue(rawValue, type)
  if (value !== undefined) {
    _.set(config, configPath, value)
  }
}

export default {
  assignConfigFromEnvironmentAndFileSystem (config, env) {
    // Apply all environment values first so file fallback eligibility is independent of mapping order.
    for (const configMapping of configMappings) {
      const { environmentVariableName } = configMapping
      const rawValue = env[environmentVariableName] // eslint-disable-line security/detect-object-injection
      assignConfigValue(config, configMapping, rawValue)
    }

    for (const configMapping of configMappings) {
      const {
        environmentVariableName,
        filePath,
        fileFallbackWhen = () => true,
      } = configMapping
      const environmentValue = env[environmentVariableName] // eslint-disable-line security/detect-object-injection
      if (!filePath || environmentValue || !fileFallbackWhen(config)) {
        continue
      }
      let rawValue
      try {
        rawValue = fs.readFileSync(filePath, 'utf8') // eslint-disable-line security/detect-non-literal-fs-filename
      } catch (err) {
        continue
      }
      assignConfigValue(config, configMapping, rawValue)
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
    assignReflectorResourcesFromEnvironment(config, env)
    if (!_.has(config, ['metricsHost']) && _.has(config, ['host'])) {
      config.metricsHost = config.host
    }
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
    if (!config.websocketAllowedOrigins?.length) {
      assert.fail('Configuration value \'websocketAllowedOrigins\' must not be empty')
    }

    if (config.tls) {
      const { certFile, privateKeyFile } = config.tls
      if (!certFile || !privateKeyFile) {
        assert.fail("Both 'tls.certFile' and 'tls.privateKeyFile' must be configured for TLS")
      }
      config.tls = {
        cert: fs.readFileSync(certFile), // eslint-disable-line security/detect-non-literal-fs-filename --- from config, not user controlled
        key: fs.readFileSync(privateKeyFile), // eslint-disable-line security/detect-non-literal-fs-filename --- from config, not user controlled
      }
    }

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

    const avatarSource = _.get(config, ['frontend', 'avatarSource'])
    if (avatarSource) {
      const validAvatarSources = ['gravatar', 'none']
      if (!validAvatarSources.includes(avatarSource)) {
        assert.fail(`Configuration value 'frontend.avatarSource' must be one of: ${validAvatarSources.join(', ')}. Got: ${avatarSource}`)
      }
    } else {
      _.set(config, ['frontend', 'avatarSource'], 'gravatar')
    }

    const ticketAvatarSource = _.get(config, ['frontend', 'ticket', 'avatarSource'])
    if (ticketAvatarSource) {
      const validTicketAvatarSources = ['gravatar', 'none', 'github']
      if (!validTicketAvatarSources.includes(ticketAvatarSource)) {
        assert.fail(`Configuration value 'frontend.ticket.avatarSource' must be one of: ${validTicketAvatarSources.join(', ')}. Got: ${ticketAvatarSource}`)
      }
    } else if (_.has(config, ['frontend', 'ticket'])) {
      _.set(config, ['frontend', 'ticket', 'avatarSource'], 'github')
    }

    validateReflectorConfig(config)

    return config
  },
  readConfig (path) {
    const data = fs.readFileSync(path, 'utf8') // eslint-disable-line security/detect-non-literal-fs-filename
    return yamlLoad(data)
  },
}
