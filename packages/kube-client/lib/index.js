//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const assert = require('assert').strict
const Client = require('./Client')
const Store = require('./cache/Store')
const { Resources } = require('./resources')
const { load } = require('@gardener-dashboard/kube-config')

const ac = new AbortController()
const clientConfig = load(process.env, { signal: ac.signal })

function createClient (workspace, options) {
  assert.ok(options.auth && options.auth.bearer, 'Client credentials are required')
  return new Client(clientConfig, workspace, options)
}

function createDashboardClient (workspace, options) {
  return new Client(clientConfig, workspace, options)
}

function abortWatcher () {
  ac.abort()
}

exports = module.exports = createClient

Object.assign(exports, {
  createClient,
  createDashboardClient,
  abortWatcher,
  Resources,
  Store,
})
