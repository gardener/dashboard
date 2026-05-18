//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  computed,
  isRef,
} from 'vue'

/**
 * Composable for SVG donut chart geometry.
 *
 * @param {import('vue').Ref<Array<{ key: string, value: number }>>} segmentsDef
 *   Reactive segment definitions. Each segment must have a `key` and a numeric `value`.
 *   Segments with `value <= 0` are automatically filtered out.
 * @param {object} [options]
 * @param {number} [options.size=30]          Outer SVG size in px
 * @param {number} [options.strokeWidth=4]    Stroke width of the donut ring
 * @param {import('vue').Ref<number>} [options.total]
 *   Override the total used for proportional calculation.
 *   If omitted, total is computed as the sum of all segment values.
 * @returns Reactive donut geometry
 */
export function useDonutChart (segmentsDef, options = {}) {
  if (!isRef(segmentsDef)) {
    throw new TypeError('First argument `segmentsDef` must be a ref object')
  }

  const {
    size = 30,
    strokeWidth = 4,
    total: totalOverride,
  } = options

  if (totalOverride !== undefined && !isRef(totalOverride)) {
    throw new TypeError('Option `total` must be a ref object')
  }

  const center = size / 2
  const radius = center - strokeWidth / 2
  const circumference = 2 * Math.PI * radius

  const viewBox = `0 0 ${size} ${size}`
  const rotateTransform = `rotate(-90 ${center} ${center})`

  const visibleSegments = computed(() => {
    const raw = segmentsDef.value
    if (!raw?.length) {
      return []
    }

    const override = totalOverride?.value
    const total = override != null && override > 0
      ? override
      : raw.reduce((sum, s) => sum + Math.max(0, s.value), 0)
    if (total === 0) {
      return []
    }

    let offset = 0
    return raw
      .filter(s => s.value > 0)
      .map(segment => {
        const length = (segment.value / total) * circumference
        const dasharray = length === circumference
          ? `${circumference} 0`
          : `${length} ${circumference}`
        const dashoffset = `${-offset}`
        offset += length
        return {
          ...segment,
          dasharray,
          dashoffset,
        }
      })
  })

  return {
    size,
    center,
    radius,
    strokeWidth,
    circumference,
    viewBox,
    rotateTransform,
    visibleSegments,
  }
}
