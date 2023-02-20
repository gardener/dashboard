//
// SPDX-FileCopyrightText: 2022 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { homedir } = require('os')
const { join } = require('path')
const _ = require('lodash')

function gardenerConfigPath () {
  return join(homedir(), '.gardener', 'config.yaml')
}

function nextTick () {
  return new Promise(resolve => process.nextTick(resolve))
}

function delay (milliseconds) {
  return typeof milliseconds === 'number'
    ? new Promise(resolve => setTimeout(resolve, milliseconds))
    : nextTick()
}

function createUrl (headers) {
  const {
    ':path': path,
    ':scheme': scheme = 'https',
    ':authority': authority = 'localhost'
  } = headers
  return new URL(path, scheme + '://' + authority)
}

function parseSelector (name) {
  return obj => {
    let selector
    if (typeof obj === 'string') {
      selector = obj
    } else {
      if (obj && obj[':path']) {
        obj = createUrl(obj)
      }
      if (obj instanceof URL) {
        obj = obj.searchParams
      }
      if (obj instanceof URLSearchParams) {
        selector = obj.get(name)
      }
    }

    if (!selector) {
      return {}
    }

    return _
      .chain(selector)
      .split(',')
      .map(value => value.split('='))
      .fromPairs()
      .value()
  }
}

function parseFieldSelector (obj) {
  const fields = parseSelector('fieldSelector')(obj)
  const iteratee = (accumulator, value, key) => _.set(accumulator, key, value)
  return _.reduce(fields, iteratee, {})
}

function createTerminalConfig (terminalConfig = {}) {
  const apiServerIngress = {
    annotations: {
      foo: 'bar'
    }
  }
  return _.merge({
    gardenTerminalHost: {
      apiServerIngressHost: 'gardenTerminalApiServerIngressHost'
    },
    bootstrap: {
      disabled: true,
      seedDisabled: true,
      shootDisabled: true,
      gardenTerminalHostDisabled: true,
      apiServerIngress: _.cloneDeep(apiServerIngress),
      gardenTerminalHost: {
        apiServerIngress: _.cloneDeep(apiServerIngress)
      }
    }
  }, terminalConfig)
}

function getStates (resources, bootstrapper) {
  return resources.map(resource => bootstrapper.bootstrapState.getValue(resource).state)
}

function getDescription (item) {
  const { kind, metadata: { namespace, name, uid } } = item
  return `${kind} - ${namespace}/${name} (${uid})`
}

function isDrained (emitter) {
  return new Promise((resolve, reject) => {
    let settled = false
    const done = err => {
      if (!settled) {
        settled = true
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      }
    }
    const timeoutId = setTimeout(() => done(), 5)
    emitter.once('drain', () => done())
    emitter.once('task_queued', () => clearTimeout(timeoutId))
    emitter.once('error', err => done(err))
  })
}

module.exports = {
  createTerminalConfig,
  getStates,
  getDescription,
  gardenerConfigPath,
  parseFieldSelector,
  isDrained,
  nextTick,
  delay
}
