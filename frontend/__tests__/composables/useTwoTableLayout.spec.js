//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  ref,
  nextTick,
} from 'vue'
import { vi } from 'vitest'

import { useTwoTableLayout } from '@/composables/useTwoTableLayout'

const mockHeight = ref(0)
vi.mock('@vueuse/core', async importOriginal => {
  const original = await importOriginal()
  return {
    ...original,
    useElementSize: vi.fn(() => ({
      width: ref(0),
      height: mockHeight,
    })),
  }
})

describe('composables', () => {
  describe('useTwoTableLayout', () => {
    const itemHeight = 50
    const staticOffset = 100
    let firstItemCount
    let secondItemCount

    beforeEach(() => {
      mockHeight.value = 0
      firstItemCount = ref(0)
      secondItemCount = ref(0)
    })

    it('should throw if container is missing', () => {
      expect(() => useTwoTableLayout({
        container: null,
        firstItemCount: ref(0),
        secondItemCount: ref(0),
        itemHeight,
      })).toThrow('useTwoTableLayout requires a "container" ref')
    })

    it('should return flex 0 1 auto for both when container height is 0', () => {
      const { firstTableStyle, secondTableStyle } = useTwoTableLayout({
        container: ref(document.createElement('div')),
        firstItemCount,
        secondItemCount,
        itemHeight,
        staticOffset,
      })

      expect(firstTableStyle.value).toEqual({ flex: '0 1 auto' })
      expect(secondTableStyle.value).toEqual({ flex: '0 1 auto' })
    })

    it('should return flex 0 1 auto for both when neither exceeds half', async () => {
      firstItemCount.value = 1
      secondItemCount.value = 1

      const { firstTableStyle, secondTableStyle } = useTwoTableLayout({
        container: ref(document.createElement('div')),
        firstItemCount,
        secondItemCount,
        itemHeight,
        staticOffset,
      })

      // estimated height per table: 100 + 1 * 50 = 150
      // container half: 400 / 2 = 200
      // 150 < 200, neither exceeds
      mockHeight.value = 400
      await nextTick()

      expect(firstTableStyle.value).toEqual({ flex: '0 1 auto' })
      expect(secondTableStyle.value).toEqual({ flex: '0 1 auto' })
    })

    it('should cap both at 50% when both exceed half', async () => {
      firstItemCount.value = 10
      secondItemCount.value = 10

      const { firstTableStyle, secondTableStyle } = useTwoTableLayout({
        container: ref(document.createElement('div')),
        firstItemCount,
        secondItemCount,
        itemHeight,
        staticOffset,
      })

      // estimated height per table: 100 + 10 * 50 = 600
      // container half: 400 / 2 = 200
      // 600 > 200, both exceed
      mockHeight.value = 400
      await nextTick()

      expect(firstTableStyle.value).toEqual({ flex: '0 1 auto', maxHeight: '50%' })
      expect(secondTableStyle.value).toEqual({ flex: '0 1 auto', maxHeight: '50%' })
    })

    it('should protect small table from shrinking when only the other exceeds half', async () => {
      firstItemCount.value = 1
      secondItemCount.value = 10

      const { firstTableStyle, secondTableStyle } = useTwoTableLayout({
        container: ref(document.createElement('div')),
        firstItemCount,
        secondItemCount,
        itemHeight,
        staticOffset,
      })

      // first estimated: 100 + 1 * 50 = 150
      // second estimated: 100 + 10 * 50 = 600
      // container half: 400 / 2 = 200
      // first < 200, second > 200
      mockHeight.value = 400
      await nextTick()

      expect(firstTableStyle.value).toEqual({ flex: '0 0 auto' })
      expect(secondTableStyle.value).toEqual({ flex: '0 1 auto' })
    })

    it('should handle the reverse case where only first exceeds half', async () => {
      firstItemCount.value = 10
      secondItemCount.value = 1

      const { firstTableStyle, secondTableStyle } = useTwoTableLayout({
        container: ref(document.createElement('div')),
        firstItemCount,
        secondItemCount,
        itemHeight,
        staticOffset,
      })

      mockHeight.value = 400
      await nextTick()

      expect(firstTableStyle.value).toEqual({ flex: '0 1 auto' })
      expect(secondTableStyle.value).toEqual({ flex: '0 0 auto' })
    })

    it('should react to item count changes', async () => {
      firstItemCount.value = 1
      secondItemCount.value = 1

      const { firstTableStyle, secondTableStyle } = useTwoTableLayout({
        container: ref(document.createElement('div')),
        firstItemCount,
        secondItemCount,
        itemHeight,
        staticOffset,
      })

      mockHeight.value = 400
      await nextTick()

      expect(firstTableStyle.value).toEqual({ flex: '0 1 auto' })
      expect(secondTableStyle.value).toEqual({ flex: '0 1 auto' })

      // Increase second table to exceed half
      secondItemCount.value = 10
      await nextTick()

      expect(firstTableStyle.value).toEqual({ flex: '0 0 auto' })
      expect(secondTableStyle.value).toEqual({ flex: '0 1 auto' })
    })

    it('should default staticOffset to 0', async () => {
      firstItemCount.value = 3

      const { firstTableStyle } = useTwoTableLayout({
        container: ref(document.createElement('div')),
        firstItemCount,
        secondItemCount: ref(0),
        itemHeight,
      })

      // estimated height: 0 + 3 * 50 = 150
      // container half: 400 / 2 = 200
      // 150 < 200, does not exceed
      mockHeight.value = 400
      await nextTick()

      expect(firstTableStyle.value).toEqual({ flex: '0 1 auto' })
    })
  })
})
