//
// SPDX-FileCopyrightText: 2022 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const { matchers, ...fixtures } = require('./__fixtures__')

expect.extend(matchers)

global.fixtures = fixtures

delete process.env.KUBECONFIG

jest.mock('./lib/config/config', () => {
  const { upperFirst } = require('lodash')
  const fixtures = require('./__fixtures__')
  const originalConfig = jest.requireActual('./lib/config/config')
  return {
    ...originalConfig,
    load: jest.fn(() => {
      const config = {}
      for (const [key, value] of Object.entries(fixtures.config.default)) {
        const mock = jest.fn(() => value)
        Object.defineProperty(config, 'mock' + upperFirst(key), {
          value: mock
        })
        Object.defineProperty(config, key, {
          enumerable: true,
          get: mock
        })
      }
      return config
    })
  }
})

jest.mock('./lib/cache', () => {
  const fixtures = require('./__fixtures__')
  const originalCache = jest.requireActual('./lib/cache')
  const seedList = fixtures.seeds.list()
  const cache = {
    getSeeds: jest.fn().mockReturnValue(seedList),
    getShoots: jest.fn(),
    initialize: jest.fn()
  }
  cache.getSeed = originalCache.getSeed.bind(cache)
  return cache
})
