//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  setActivePinia,
  createPinia,
} from 'pinia'

import { useSeedTableSorting } from '@/composables/useSeedTableSorting'

import map from 'lodash/map'

function sortSeedsByLastOperation (items, order = 'asc') {
  const { customKeySort } = useSeedTableSorting()
  const comparator = customKeySort.lastOperation
  return [...items].sort((a, b) => {
    const compareResult = comparator(a, b)
    return order === 'desc'
      ? -compareResult
      : compareResult
  })
}

describe('composables', () => {
  describe('useSeedTableSorting', () => {
    beforeEach(() => {
      setActivePinia(createPinia())
    })

    it('should sort seeds by lastOperation in ascending order using seed semantics', () => {
      const seeds = [
        {
          metadata: {
            name: 'healthy',
          },
          status: {
            lastOperation: {
              state: 'Succeeded',
              progress: 100,
            },
          },
        },
        {
          metadata: {
            name: 'error-failed',
          },
          status: {
            lastOperation: {
              state: 'Failed',
              progress: 100,
            },
          },
        },
        {
          metadata: {
            name: 'healthy-processing',
          },
          status: {
            lastOperation: {
              state: 'Processing',
              progress: 42,
            },
          },
        },
      ]

      const sorted = sortSeedsByLastOperation(seeds, 'asc')

      expect(map(sorted, 'metadata.name')).toEqual([
        'error-failed',
        'healthy-processing',
        'healthy',
      ])
    })

    it('should sort seeds by lastOperation in descending order using seed semantics', () => {
      const seeds = [
        {
          metadata: {
            name: 'healthy',
          },
          status: {
            lastOperation: {
              state: 'Succeeded',
              progress: 100,
            },
          },
        },
        {
          metadata: {
            name: 'error',
          },
          status: {
            lastOperation: {
              state: 'Failed',
              progress: 100,
            },
          },
        },
        {
          metadata: {
            name: 'processing',
          },
          status: {
            lastOperation: {
              state: 'Processing',
              progress: 35,
            },
          },
        },
      ]

      const sorted = sortSeedsByLastOperation(seeds, 'desc')

      expect(map(sorted, 'metadata.name')).toEqual([
        'healthy',
        'processing',
        'error',
      ])
    })
  })
})
