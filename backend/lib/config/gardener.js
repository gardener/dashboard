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
    try {
      if (filename) {
        if (this.existsSync(filename)) {
          _.merge(config, yaml.safeLoad(this.readFileSync(filename, 'utf8')))
        }
        if (env.PORT) {
          const port = parseInt(env.PORT, 10)
          if (Number.isInteger(port)) {
            config.port = port
          }
        }
        config.frontend.primaryLoginType = config.oidc ? 'oidc' : 'token'

        const secretsPath = joinPath(dirname(filename), 'secrets')
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
