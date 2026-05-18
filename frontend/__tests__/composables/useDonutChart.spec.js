//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  ref,
  nextTick,
} from 'vue'

import { useDonutChart } from '@/composables/useDonutChart'

describe('composables', () => {
  describe('useDonutChart', () => {
    it('should throw if segments are not provided as a ref', () => {
      expect(() => useDonutChart([])).toThrow(new TypeError('First argument `segmentsDef` must be a ref object'))
    })

    it('should throw if total override is not provided as a ref', () => {
      const segments = ref([])

      expect(() => useDonutChart(segments, { total: 100 })).toThrow(new TypeError('Option `total` must be a ref object'))
    })

    it('should return correct static geometry for default options', () => {
      const segments = ref([])
      const donut = useDonutChart(segments)

      expect(donut.size).toBe(30)
      expect(donut.center).toBe(15)
      expect(donut.strokeWidth).toBe(4)
      expect(donut.radius).toBe(13)
      expect(donut.viewBox).toBe('0 0 30 30')
      expect(donut.rotateTransform).toBe('rotate(-90 15 15)')
      expect(donut.circumference).toBeCloseTo(2 * Math.PI * 13)
    })

    it('should return correct geometry for custom size and strokeWidth', () => {
      const segments = ref([])
      const donut = useDonutChart(segments, { size: 64, strokeWidth: 8 })

      expect(donut.size).toBe(64)
      expect(donut.center).toBe(32)
      expect(donut.strokeWidth).toBe(8)
      expect(donut.radius).toBe(28)
      expect(donut.viewBox).toBe('0 0 64 64')
    })

    it('should return empty visibleSegments when segments are empty', () => {
      const segments = ref([])
      const donut = useDonutChart(segments)

      expect(donut.visibleSegments.value).toEqual([])
    })

    it('should filter out segments with value <= 0', () => {
      const segments = ref([
        { key: 'a', value: 10 },
        { key: 'b', value: 0 },
        { key: 'c', value: -5 },
        { key: 'd', value: 5 },
      ])
      const donut = useDonutChart(segments)

      const keys = donut.visibleSegments.value.map(s => s.key)
      expect(keys).toEqual(['a', 'd'])
    })

    it('should compute correct dasharray for a single segment', () => {
      const segments = ref([
        { key: 'only', value: 100 },
      ])
      const donut = useDonutChart(segments)
      const [seg] = donut.visibleSegments.value

      // Single segment fills the entire circumference
      expect(seg.dasharray).toBe(`${donut.circumference} 0`)
      expect(seg.dashoffset).toBe('0')
    })

    it('should compute correct dasharray and dashoffset for multiple segments', () => {
      const segments = ref([
        { key: 'a', value: 75 },
        { key: 'b', value: 25 },
      ])
      const donut = useDonutChart(segments)
      const result = donut.visibleSegments.value
      const c = donut.circumference

      expect(result).toHaveLength(2)

      // First segment: 75% of circumference
      const lengthA = 0.75 * c
      expect(result[0].dasharray).toBe(`${lengthA} ${c}`)
      expect(result[0].dashoffset).toBe('0')

      // Second segment: 25% of circumference, offset by first
      const lengthB = 0.25 * c
      expect(result[1].dasharray).toBe(`${lengthB} ${c}`)
      expect(result[1].dashoffset).toBe(`${-lengthA}`)
    })

    it('should use total override when provided', () => {
      const segments = ref([
        { key: 'a', value: 20 },
      ])
      const total = ref(100)
      const donut = useDonutChart(segments, { total })
      const [seg] = donut.visibleSegments.value
      const c = donut.circumference

      // 20/100 = 20% of circumference
      const expected = 0.2 * c
      expect(seg.dasharray).toBe(`${expected} ${c}`)
    })

    it('should fall back to sum when total override is 0', () => {
      const segments = ref([
        { key: 'a', value: 50 },
        { key: 'b', value: 50 },
      ])
      const donut = useDonutChart(segments, { total: ref(0) })
      const result = donut.visibleSegments.value

      // Falls back to sum = 100, each gets 50%
      expect(result).toHaveLength(2)
    })

    it('should react to segment changes', async () => {
      const segments = ref([
        { key: 'a', value: 100 },
      ])
      const donut = useDonutChart(segments)

      expect(donut.visibleSegments.value).toHaveLength(1)

      segments.value = [
        { key: 'a', value: 60 },
        { key: 'b', value: 40 },
      ]
      await nextTick()

      expect(donut.visibleSegments.value).toHaveLength(2)
    })

    it('should preserve extra properties on segments', () => {
      const segments = ref([
        { key: 'x', value: 10, color: 'red' },
      ])
      const donut = useDonutChart(segments)
      const [seg] = donut.visibleSegments.value

      expect(seg.color).toBe('red')
      expect(seg.key).toBe('x')
    })
  })
})
