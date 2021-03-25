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
const kubeconfig = require('@gardener-dashboard/kube-config')
const config = kubeconfig.load(process.env)

function createClient ({ auth, key, cert, ...options } = {}) {
  assert.ok(auth || (key && cert), 'Client credentials are required')
  if (key && cert) {
    options.key = key
    options.cert = cert
  } else if (auth) {
    options.auth = auth
  }
  // if no url is given use server from kubeconfig
  if (!options.url) {
    options.url = config.url
    options.ca = config.ca
    options.rejectUnauthorized = config.rejectUnauthorized
  }
  return new Client(options)
}

exports = module.exports = createClient

// create a client instance for the gardener cluster with dashboard privileges
const dashboardClient = new Client(config)

Object.assign(exports, {
  createClient,
  dashboardClient,
  Resources,
  Store
})
