//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import assert from 'node:assert'
import Client from './Client.js'
import Store from './cache/Store.js'
import { Resources } from './resources/index.js'
import kubeConfig from '@gardener-dashboard/kube-config'

const { load } = kubeConfig

const ac = new AbortController()
const clientConfig = load(process.env, { signal: ac.signal })

function createClient (options) {
  assert.ok(options.auth && options.auth.bearer, 'Client credentials are required')
  return new Client(clientConfig, options)
}

function createDashboardClient (options) {
  return new Client(clientConfig, options)
}

function abortWatcher () {
  ac.abort()
}

// create a client instance for the gardener cluster with dashboard privileges
const dashboardClient = new Client(clientConfig)

export default {
  createClient,
  createDashboardClient,
  abortWatcher,
  dashboardClient,
  Resources,
  Store,
}
