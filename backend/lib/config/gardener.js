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

const assert = require('assert').strict
const _ = require('lodash')
const yaml = require('js-yaml')
const { existsSync, readFileSync } = require('fs')
const { homedir } = require('os')
const { join: joinPath } = require('path')

const environmentVariableDefinitions = {
  SESSION_SECRET: 'sessionSecret', // pragma: whitelist secret
  OIDC_ISSUER: 'oidc.issuer',
  OIDC_CLIENT_ID: 'oidc.client_id',
  OIDC_CLIENT_SECRET: 'oidc.client_secret', // pragma: whitelist secret
  OIDC_REDIRECT_URI: 'oidc.redirect_uri',
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
    if (/^test/.test(env.NODE_ENV)) {
      return joinPath(__dirname, 'test.yaml')
    }
    if (env.GARDENER_CONFIG) {
      return env.GARDENER_CONFIG
    }
    if (argv[2]) {
      return argv[2]
    }
    return joinPath(homedir(), '.gardener', 'config.yaml')
  },
  loadConfig (filename, { env } = process) {
    const config = this.getDefaults({ env })
    if (filename) {
      try {
        if (this.existsSync(filename)) {
          _.merge(config, yaml.safeLoad(this.readFileSync(filename, 'utf8')))
        }
        _.set(config, 'frontend.primaryLoginType', config.oidc ? 'oidc' : 'token')
      } catch (err) { /* ignore */ }
    }
    this.assignEnvironmentVariables(config, env)
    if (!config.gitHub && _.has(config, 'frontend.gitHubRepoUrl')) {
      _.unset(config, 'frontend.gitHubRepoUrl')
    }
    const requiredConfigurationProperties = [
      'sessionSecret',
      'oidc.issuer',
      'oidc.client_id',
      'oidc.client_secret',
      'oidc.redirect_uri'
    ]
    _.forEach(requiredConfigurationProperties, path => {
      assert.ok(_.get(config, path), `Configuration value '${path}' is required`)
    })
    return config
  },
  existsSync,
  readFileSync
}
