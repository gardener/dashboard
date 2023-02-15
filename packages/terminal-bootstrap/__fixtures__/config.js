//
// SPDX-FileCopyrightText: 2022 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { gardenerConfigPath } = require('./helper')

const defaultConfigPath = gardenerConfigPath()
const defaultConfig = {
  logLevel: 'info',
  terminal: {
    gardenTerminalHost: {
      seedRef: 'infra1-seed2'
    },
    bootstrap: {
      disabled: true
    }
  },
  unreachableSeeds: {
    matchLabels: {
      'test-unreachable': 'true'
    }
  }
}

const configMap = new Map()
configMap.set(defaultConfigPath, defaultConfig)

module.exports = {
  default: defaultConfig,
  get (key) {
    return configMap.get(key || defaultConfigPath)
  },
  list () {
    return Array.from(configMap.entries())
  }
}
