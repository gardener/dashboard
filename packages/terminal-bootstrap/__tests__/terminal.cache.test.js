//
// SPDX-FileCopyrightText: 2022 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

const fixtures = require('../__fixtures__')

const cache = jest.requireActual('../lib/cache')
describe('terminal', () => {
  describe('cache', () => {
    const informers = {
      seeds: {
        store: fixtures.seeds
      },
      shoots: {
        store: fixtures.shoots
      }
    }

    beforeEach(() => {
      cache.initialize(informers)
    })

    it('should return all seeds', () => {
      expect(cache.getSeeds()).toEqual(fixtures.seeds.list())
    })

    it('should return a single seed', () => {
      const name = 'infra1-seed'
      expect(cache.getSeed(name)).toEqual(fixtures.seeds.get(name))
    })

    it('should return all shoots', () => {
      expect(cache.getShoots()).toEqual(fixtures.shoots.list())
    })
  })
})
