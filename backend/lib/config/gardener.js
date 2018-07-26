//
// Copyright (c) 2018 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file
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

const _ = require('lodash')
const yaml = require('js-yaml')
const { existsSync, readFileSync } = require('fs')
const { homedir } = require('os')
const { join: joinPath, dirname } = require('path')

/*
objectPath: foo.bar.foobar
pathToSecret: <secretsPath>/foo/bar/foobar
*/
function buildPathToSecret (secretsPath, objectPath) {
  const pathToSecret = joinPath(secretsPath, ..._.toPath(objectPath))
  return pathToSecret
}

function applySecretToConfig (config, secretsPath, objectPath) {
  const pathToSecret = buildPathToSecret(secretsPath, objectPath)

  const secretExists = existsSync(pathToSecret)
  if (secretExists) {
    const secretValue = readFileSync(pathToSecret, 'utf8')
    _.set(config, objectPath, secretValue)
  }
}

module.exports = {
  getDefaults ({env} = process) {
    const isProd = env.NODE_ENV === 'production'
    const port = env.PORT || 3030
    const issuer = `http://localhost:${port}/identity`
    return {
      isProd,
      logLevel: isProd ? 'warn' : 'debug',
      port,
      apiServerUrl: 'https://minikube:8443',
      gitHub: {
        apiUrl: 'https://api.github.com',
        org: 'gardener',
        repository: 'journal-dev',
        webhookSecret: '776562686f6f6b536563726574',
        authentication: {
          token: '746f6b656e'
        }
      },
      jwks: {
        cache: false,
        rateLimit: false,
        jwksRequestsPerMinute: 5,
        jwksUri: `${issuer}/keys`
      },
      jwt: {
        audience: 'gardener',
        issuer,
        algorithms: ['RS256']
      },
      frontend: {
        oidc: {
          authority: issuer,
          client_id: 'gardener',
          redirect_uri: `http://localhost:${port}/callback`,
          response_type: 'id_token token',
          scope: 'openid email profile groups audience:server:client_id:gardener audience:server:client_id:kube-kubectl',
          loadUserInfo: false
        },
        dashboardUrl: {
          pathname: '/api/v1/namespaces/kube-system/services/https:kubernetes-dashboard:/proxy'
        }
      }
    }
  },
  getFilename ({argv, env} = process) {
    if (/^test$/.test(env.NODE_ENV)) {
      return
    }
    if (/^testing$/.test(env.NODE_ENV)) {
      return joinPath(__dirname, 'testing.yaml')
    }
    if (env.GARDENER_CONFIG) {
      return env.GARDENER_CONFIG
    }
    if (argv[2]) {
      return argv[2]
    }
    return joinPath(homedir(), '.gardener', 'config.yaml')
  },
  loadConfig (filename, {env} = process) {
    const config = this.getDefaults({env})
    try {
      if (filename) {
        if (this.existsSync(filename)) {
          _.merge(config, yaml.safeLoad(this.readFileSync(filename, 'utf8')))
        }

        const secretsPath = joinPath(dirname(filename), 'secrets')
        applySecretToConfig(config, secretsPath, 'prometheus.secret')
        applySecretToConfig(config, secretsPath, 'gitHub.webhookSecret')
        applySecretToConfig(config, secretsPath, 'gitHub.authentication.username')
        applySecretToConfig(config, secretsPath, 'gitHub.authentication.token')
      }
    } catch (err) { /* ignore */ }

    if (!config.gitHub && _.get(config, 'frontend.gitHubRepoUrl')) {
      _.unset(config, 'frontend.gitHubRepoUrl')
    }
    return config
  },
  existsSync,
  readFileSync
}
