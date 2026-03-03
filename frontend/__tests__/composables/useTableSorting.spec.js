//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { nextTick } from 'vue'

import { useTableSorting } from '@/composables/useTableSorting'
import { getLastOperationSortVal } from '@/composables/useTableSorting/helper'

describe('composables', () => {
  describe('useTableSorting', () => {
    describe('sortBy', () => {
      it('should use default sort by name ascending', () => {
        const { sortBy } = useTableSorting()

        expect(sortBy.value).toEqual([{ key: 'name', order: 'asc' }])
      })

      it('should use provided default sort config', () => {
        const defaultSortBy = [{ key: 'createdAt', order: 'desc' }]
        const { sortBy } = useTableSorting({ defaultSortBy })

        expect(sortBy.value).toEqual(defaultSortBy)
      })

      it('should call onSortChange when sorting changes', async () => {
        const onSortChange = vi.fn()
        const { sortBy } = useTableSorting({ onSortChange })

        sortBy.value = [{ key: 'createdAt', order: 'desc' }]
        await nextTick()

        expect(onSortChange).toHaveBeenCalledWith([{ key: 'createdAt', order: 'desc' }])
      })

      it('should throw if onSortChange is not a function', () => {
        expect(() => useTableSorting({ onSortChange: 'invalid' })).toThrow(TypeError)
      })
    })

    describe('compareValues', () => {
      it('should compare strings case-insensitively', () => {
        const { compareValues } = useTableSorting()

        expect(compareValues('alpha', 'Beta')).toBeLessThan(0)
        expect(compareValues('Same', 'same')).toBe(0)
      })

      it('should compare numbers', () => {
        const { compareValues } = useTableSorting()

        expect(compareValues(1, 2)).toBeLessThan(0)
        expect(compareValues(3, 2)).toBeGreaterThan(0)
      })

      it('should compare dates', () => {
        const { compareValues } = useTableSorting()

        expect(compareValues(new Date('2024-01-01'), new Date('2024-01-02'))).toBeLessThan(0)
      })

      it('should sort nullish values to the end', () => {
        const { compareValues } = useTableSorting()

        expect(compareValues(null, 'value')).toBeGreaterThan(0)
        expect(compareValues('value', undefined)).toBeLessThan(0)
        expect(compareValues(null, undefined)).toBe(0)
      })
    })

    describe('compareSemanticVersions', () => {
      it('should sort standard Kubernetes versions correctly', () => {
        const { compareSemanticVersions } = useTableSorting()
        const versions = ['v1.28.5', 'v1.30.2', 'v1.29.0']

        const sorted = [...versions].sort(compareSemanticVersions)

        expect(sorted[0]).toBe('v1.28.5')
        expect(sorted[1]).toBe('v1.29.0')
        expect(sorted[2]).toBe('v1.30.2')
      })

      it('should sort GKE versions with prerelease correctly', () => {
        const { compareSemanticVersions } = useTableSorting()
        const versions = ['v1.33.5', 'v1.33.5-gke.2072000', 'v1.33.5-gke.1070000', 'v1.33.4']

        const sorted = [...versions].sort(compareSemanticVersions)

        expect(sorted[0]).toBe('v1.33.4')
        expect(sorted[1]).toBe('v1.33.5-gke.1070000')
        expect(sorted[2]).toBe('v1.33.5-gke.2072000')
        expect(sorted[3]).toBe('v1.33.5')
      })

      it('should sort alpha/beta/rc prerelease versions correctly', () => {
        const { compareSemanticVersions } = useTableSorting()
        const versions = ['v1.30.0', 'v1.30.0-rc.1', 'v1.30.0-alpha.1', 'v1.30.0-alpha.2', 'v1.30.0-beta.1']

        const sorted = [...versions].sort(compareSemanticVersions)

        expect(sorted[0]).toBe('v1.30.0-alpha.1')
        expect(sorted[1]).toBe('v1.30.0-alpha.2')
        expect(sorted[2]).toBe('v1.30.0-beta.1')
        expect(sorted[3]).toBe('v1.30.0-rc.1')
        expect(sorted[4]).toBe('v1.30.0')
      })

      it('should handle null and undefined versions', () => {
        const { compareSemanticVersions } = useTableSorting()
        const versions = ['v1.29.0', null, undefined, 'v1.28.5']

        const sorted = [...versions].sort(compareSemanticVersions)

        expect(sorted[0]).toBe('v1.28.5')
        expect(sorted[1]).toBe('v1.29.0')
        expect(sorted[2]).toBeNull()
        expect(sorted[3]).toBeUndefined()
      })

      it('should also work without v prefix', () => {
        const { compareSemanticVersions } = useTableSorting()
        const versions = ['1.28.5', '1.30.2', '1.29.0']

        const sorted = [...versions].sort(compareSemanticVersions)

        expect(sorted[0]).toBe('1.28.5')
        expect(sorted[1]).toBe('1.29.0')
        expect(sorted[2]).toBe('1.30.2')
      })

      it('should fallback to string comparison for non-semver values', () => {
        const { compareSemanticVersions } = useTableSorting()
        const values = ['build-10', 'build-2', 'build-1']

        const sorted = [...values].sort(compareSemanticVersions)

        expect(sorted).toEqual(['build-1', 'build-2', 'build-10'])
      })
    })

    describe('getLastOperationSortVal', () => {
      it('should use default user-error detection from lastErrors', () => {
        const value = getLastOperationSortVal({
          operation: {
            state: 'Succeeded',
            progress: 100,
          },
          lastErrors: [
            {
              codes: ['ERR_CONFIGURATION_PROBLEM'],
            },
          ],
        })

        expect(value).toBe(200)
      })

      it('should allow overriding user-error detection via callback', () => {
        const value = getLastOperationSortVal({
          operation: {
            state: 'Succeeded',
            progress: 100,
          },
          lastErrors: [
            {
              codes: ['ERR_CONFIGURATION_PROBLEM'],
            },
          ],
          isUserErrorFn: () => false,
        })

        expect(value).toBe(0)
      })
    })
  })
})
