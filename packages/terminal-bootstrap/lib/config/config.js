//
// SPDX-FileCopyrightText: 2022 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const fs = require('fs')
const { homedir } = require('os')
const { join } = require('path')
const yaml = require('js-yaml')
const { merge } = require('lodash')

module.exports = {
  getFilename ({ argv, env }) {
    if (env.GARDENER_CONFIG) {
      return env.GARDENER_CONFIG
    }
    return join(homedir(), '.gardener', 'config.yaml')
  },
  getDefaults ({ env }) {
    return {
      logLevel: env.NODE_ENV === 'production' ? 'warn' : 'debug'
    }
  },
  read (path) {
    return yaml.load(fs.readFileSync(path, 'utf8'))
  },
  load (options) {
    const filename = this.getFilename(options)
    const config = this.getDefaults(options)
    try {
      merge(config, this.read(filename))
    } catch (err) { /* ignore */ }
    return config
  }
}
