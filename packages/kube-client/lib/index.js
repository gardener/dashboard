//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import assert from 'node:assert'
import BaseClient from './Client.js'
import Store from './cache/Store.js'
import { Resources } from './resources/index.js'
import kubeConfig from '@gardener-dashboard/kube-config'

const { load } = kubeConfig
const MAX_TIMEOUT = 2_147_483_647 // Node.js TIMEOUT_MAX (2^31 - 1)
const KUBE_CLIENT_DEFAULT_READ_IDLE_TIMEOUT = 30000
const KUBE_CLIENT_DEFAULT_PING_TIMEOUT = 15000

function parseTimeout (value, envName, defaultValue) {
  if (value === undefined || value === '') {
    return defaultValue
  }
  const timeout = /^\d+$/.test(value) ? Number(value) : NaN
  if (!Number.isFinite(timeout) || timeout > MAX_TIMEOUT) {
    throw TypeError(`${envName} must be a non-negative integer <= ${MAX_TIMEOUT}`)
  }
  return timeout
}

const defaultOptions = {
  readIdleTimeout: parseTimeout(
    process.env.KUBE_CLIENT_READ_IDLE_TIMEOUT,
    'KUBE_CLIENT_READ_IDLE_TIMEOUT',
    KUBE_CLIENT_DEFAULT_READ_IDLE_TIMEOUT,
  ),
  pingTimeout: parseTimeout(
    process.env.KUBE_CLIENT_PING_TIMEOUT,
    'KUBE_CLIENT_PING_TIMEOUT',
    KUBE_CLIENT_DEFAULT_PING_TIMEOUT,
  ),
}

class Client extends BaseClient {
  constructor (clientConfig, options = {}) {
    const {
      readIdleTimeout,
      pingTimeout,
      ...rest
    } = options

    const resolvedOptions = {
      ...defaultOptions,
      ...rest,
    }

    if (readIdleTimeout !== undefined) {
      resolvedOptions.readIdleTimeout = readIdleTimeout
    }
    if (pingTimeout !== undefined) {
      resolvedOptions.pingTimeout = pingTimeout
    }

    super(clientConfig, resolvedOptions)
  }
}

const ac = new AbortController()
const clientConfig = load(process.env, { signal: ac.signal })

function createClient (options = {}) {
  assert.ok(options.auth && options.auth.bearer, 'Client credentials are required')
  return new Client(clientConfig, options)
}

function createDashboardClient (options = {}) {
  return new Client(clientConfig, options)
}

function abortWatcher () {
  ac.abort()
}

// create a client instance for the gardener cluster with dashboard privileges
const dashboardClient = createDashboardClient()

export default {
  createClient,
  createDashboardClient,
  abortWatcher,
  dashboardClient,
  Resources,
  Store,
}
