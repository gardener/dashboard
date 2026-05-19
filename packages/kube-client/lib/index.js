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

function parseRequestTimeout (value) {
  if (value === undefined || value === '') {
    return undefined
  }
  const requestTimeout = /^\d+$/.test(value) ? Number(value) : NaN
  if (!Number.isFinite(requestTimeout) || requestTimeout > MAX_TIMEOUT) {
    throw TypeError(`KUBE_CLIENT_REQUEST_TIMEOUT must be a non-negative integer <= ${MAX_TIMEOUT}`)
  }
  return requestTimeout
}

const requestTimeout = parseRequestTimeout(process.env.KUBE_CLIENT_REQUEST_TIMEOUT)
const defaultOptions = requestTimeout === undefined
  ? {}
  : { requestTimeout }

class Client extends BaseClient {
  constructor (clientConfig, options = {}) {
    const { requestTimeout, ...rest } = options

    const resolvedOptions = {
      ...defaultOptions,
      ...rest,
    }

    if (requestTimeout !== undefined) {
      resolvedOptions.requestTimeout = requestTimeout
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
