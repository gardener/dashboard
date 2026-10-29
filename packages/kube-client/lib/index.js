//
// SPDX-FileCopyrightText: Contributors to the Gardener project
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
const KUBE_CLIENT_DEFAULT_READ_IDLE_TIMEOUT = 30_000
const KUBE_CLIENT_DEFAULT_PING_TIMEOUT = 15_000
const KUBE_CLIENT_DEFAULT_REQUEST_TIMEOUT = 5 * 60 * 1_000
const MIN_WINDOW_SIZE = 65_535
const MAX_WINDOW_SIZE = 2 ** 31 - 1
const MAX_SESSION_MEMORY = 2 ** 32 - 1

function parseTimeoutValue (value, name) {
  const timeout = typeof value === 'string' && /^\d+$/.test(value)
    ? Number(value)
    : value
  if (!Number.isInteger(timeout) || timeout < 0 || timeout > MAX_TIMEOUT) {
    throw TypeError(`${name} must be a non-negative integer <= ${MAX_TIMEOUT}`)
  }
  return timeout
}

function parseEnvTimeoutValue (value, envName, defaultValue) {
  if (value === undefined || value === '') {
    return defaultValue
  }
  return parseTimeoutValue(value, envName)
}

function parseWindowSize (value, name) {
  const windowSize = typeof value === 'string' && /^\d+$/.test(value)
    ? Number(value)
    : value
  if (!Number.isSafeInteger(windowSize) || windowSize < MIN_WINDOW_SIZE || windowSize > MAX_WINDOW_SIZE) {
    throw TypeError(`${name} must be an integer between ${MIN_WINDOW_SIZE} and ${MAX_WINDOW_SIZE}`)
  }
  return windowSize
}

function parseMaxSessionMemory (value, name) {
  const maxSessionMemory = typeof value === 'string' && /^\d+$/.test(value)
    ? Number(value)
    : value
  if (!Number.isSafeInteger(maxSessionMemory) || maxSessionMemory < 1 || maxSessionMemory > MAX_SESSION_MEMORY) {
    throw TypeError(`${name} must be an integer between 1 and ${MAX_SESSION_MEMORY}`)
  }
  return maxSessionMemory
}

function parseEnvValue (value, envName, parser) {
  if (value === undefined || value === '') {
    return undefined
  }
  return parser(value, envName)
}

const defaultOptions = {
  readIdleTimeout: parseEnvTimeoutValue(
    process.env.KUBE_CLIENT_READ_IDLE_TIMEOUT,
    'KUBE_CLIENT_READ_IDLE_TIMEOUT',
    KUBE_CLIENT_DEFAULT_READ_IDLE_TIMEOUT,
  ),
  pingTimeout: parseEnvTimeoutValue(
    process.env.KUBE_CLIENT_PING_TIMEOUT,
    'KUBE_CLIENT_PING_TIMEOUT',
    KUBE_CLIENT_DEFAULT_PING_TIMEOUT,
  ),
  requestTimeout: parseEnvTimeoutValue(
    process.env.KUBE_CLIENT_REQUEST_TIMEOUT,
    'KUBE_CLIENT_REQUEST_TIMEOUT',
    KUBE_CLIENT_DEFAULT_REQUEST_TIMEOUT,
  ),
  initialWindowSize: parseEnvValue(
    process.env.KUBE_CLIENT_INITIAL_WINDOW_SIZE,
    'KUBE_CLIENT_INITIAL_WINDOW_SIZE',
    parseWindowSize,
  ),
  connectionWindowSize: parseEnvValue(
    process.env.KUBE_CLIENT_CONNECTION_WINDOW_SIZE,
    'KUBE_CLIENT_CONNECTION_WINDOW_SIZE',
    parseWindowSize,
  ),
  maxSessionMemory: parseEnvValue(
    process.env.KUBE_CLIENT_MAX_SESSION_MEMORY,
    'KUBE_CLIENT_MAX_SESSION_MEMORY',
    parseMaxSessionMemory,
  ),
}

class Client extends BaseClient {
  constructor (clientConfig, options = {}) {
    const {
      readIdleTimeout,
      pingTimeout,
      requestTimeout,
      initialWindowSize,
      connectionWindowSize,
      maxSessionMemory,
      settings,
      ...rest
    } = options

    const resolvedOptions = {
      ...defaultOptions,
      ...rest,
    }

    if (readIdleTimeout !== undefined) {
      resolvedOptions.readIdleTimeout = parseTimeoutValue(readIdleTimeout, 'readIdleTimeout')
    }
    if (pingTimeout !== undefined) {
      resolvedOptions.pingTimeout = parseTimeoutValue(pingTimeout, 'pingTimeout')
    }
    if (requestTimeout !== undefined) {
      resolvedOptions.requestTimeout = parseTimeoutValue(requestTimeout, 'requestTimeout')
    }
    const resolvedInitialWindowSize = initialWindowSize ?? settings?.initialWindowSize ?? defaultOptions.initialWindowSize
    if (resolvedInitialWindowSize !== undefined) {
      resolvedOptions.settings = {
        ...settings,
        initialWindowSize: parseWindowSize(resolvedInitialWindowSize, 'initialWindowSize'),
      }
    } else if (settings !== undefined) {
      resolvedOptions.settings = settings
    }
    if (connectionWindowSize !== undefined) {
      resolvedOptions.connectionWindowSize = parseWindowSize(connectionWindowSize, 'connectionWindowSize')
    }
    if (maxSessionMemory !== undefined) {
      resolvedOptions.maxSessionMemory = parseMaxSessionMemory(maxSessionMemory, 'maxSessionMemory')
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
