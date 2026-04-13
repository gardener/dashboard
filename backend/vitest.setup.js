//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  vi,
  expect,
  beforeAll,
} from 'vitest'
import { find } from 'lodash-es'
import { createAgent } from './__vitest__/helpers/createAgent.js'

// Prevent app.js from freezing built-in prototypes.
// The offenders are third-party test libs (@sinonjs/fake-timers ClockDate, etc.),
const _originalFreeze = Object.freeze
const _builtinTargets = new Set([
  Object, Object.prototype,
  Function, Function.prototype,
  Array, Array.prototype,
  String, String.prototype,
  Number, Number.prototype,
  Boolean, Boolean.prototype,
])
Object.freeze = function freeze (target) {
  if (_builtinTargets.has(target)) {
    return target
  }
  return _originalFreeze.call(this, target)
}

// Mock workspace packages → delegate to manual mocks
vi.mock('@gardener-dashboard/request', async () => {
  return import('./__vitest__/mocks/@gardener-dashboard/request.js')
})

vi.mock('@gardener-dashboard/kube-client', async () => {
  return import('./__vitest__/mocks/@gardener-dashboard/kube-client.js')
})

vi.mock('@gardener-dashboard/kube-config', async () => {
  return import('./__vitest__/mocks/@gardener-dashboard/kube-config.js')
})

vi.mock('@gardener-dashboard/logger', async () => {
  return import('./__vitest__/mocks/@gardener-dashboard/logger.js')
})

vi.mock('@gardener-dashboard/monitor', async () => {
  return import('./__vitest__/mocks/@gardener-dashboard/monitor.js')
})

vi.mock('@gardener-dashboard/markdown', async () => {
  return import('./__vitest__/mocks/@gardener-dashboard/markdown.js')
})

vi.mock('@octokit/core', async () => {
  return import('./__vitest__/mocks/@octokit/core.js')
})

vi.mock('p-limit', async () => {
  return import('./__vitest__/mocks/p-limit.js')
})

// Mock lib/config/gardener
vi.mock('./lib/config/gardener.js', async (importOriginal) => {
  const { default: originalGardener } = await importOriginal()
  const { default: fixtures } = await import('./__vitest__/fixtures/index.js')
  const mockFiles = new Map()
  for (const [path, data] of fixtures.config.list()) {
    mockFiles.set(path, data)
  }
  const readConfig = vi.fn(path => mockFiles.get(path))
  return {
    default: {
      ...originalGardener,
      readConfig,
    },
    readConfig,
  }
})

// Mock lib/cache/index.js
vi.mock('./lib/cache/index.js', async (importOriginal) => {
  const { default: fixtures } = await import('./__vitest__/fixtures/index.js')
  const { default: originalCache } = await importOriginal()
  const { default: createTicketCache } = await import('./lib/cache/tickets.js')
  const { cache } = originalCache
  const keys = [
    'cloudprofiles',
    'seeds',
    'quotas',
    'projects',
    'controllerregistrations',
    'resourcequotas',
  ]
  for (const key of keys) {
    cache.set(key, {
      items: fixtures[key].list(),
      list () {
        return this.items
      },
      find (predicate) {
        return find(this.list(), predicate)
      },
    })
  }
  cache.ticketCache = createTicketCache()
  cache.resetTicketCache = () => (cache.ticketCache = createTicketCache())
  return { default: originalCache }
})

// Load fixtures and register custom matchers
const { default: fixtures } = await import('./__vitest__/fixtures/index.js')
const { matchers } = fixtures
expect.extend(matchers)

// Set environment variables
beforeAll(() => {
  Object.assign(process.env, fixtures.env)
})

// Expose globals
vi.stubGlobal('createAgent', createAgent)
vi.stubGlobal('fixtures', fixtures)
