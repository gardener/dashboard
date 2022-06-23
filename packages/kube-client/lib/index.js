//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const assert = require('assert').strict
const Client = require('./Client')
const Store = require('./cache/Store')
const { Resources } = require('./resources')
const clientConfig = require('@gardener-dashboard/kube-config').load(process.env)

function createClient (options) {
  assert.ok(options.auth && options.auth.bearer, 'Client credentials are required')
  return new Client(clientConfig, options)
}

function createDashboardClient (options) {
  return new Client(clientConfig, options)
}

exports = module.exports = createClient

// create a client instance for the gardener cluster with dashboard privileges
const dashboardClient = new Client(clientConfig)

Object.assign(exports, {
  createClient,
  createDashboardClient,
  dashboardClient,
  Resources,
  Store
})
