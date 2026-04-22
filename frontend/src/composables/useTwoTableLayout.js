//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { computed } from 'vue'
import { useElementSize } from '@vueuse/core'

export function useTwoTableLayout ({
  container,
  firstItemCount,
  secondItemCount,
  itemHeight,
  staticOffset = 0,
}) {
  if (!container) {
    throw new Error('useTwoTableLayout requires a "container" ref')
  }

  const { height: containerHeight } = useElementSize(container)

  function estimatedTableHeight (itemCount) {
    return staticOffset + itemCount * itemHeight
  }

  const firstExceedsHalf = computed(() => {
    return estimatedTableHeight(firstItemCount.value) > containerHeight.value / 2
  })

  const secondExceedsHalf = computed(() => {
    return estimatedTableHeight(secondItemCount.value) > containerHeight.value / 2
  })

  function computeStyle (selfExceedsHalf, otherExceedsHalf) {
    if (!containerHeight.value) {
      return { flex: '0 1 auto' }
    }
    if (selfExceedsHalf && otherExceedsHalf) {
      return { flex: '0 1 auto', maxHeight: '50%' }
    }
    if (otherExceedsHalf) {
      return { flex: '0 0 auto' }
    }
    return { flex: '0 1 auto' }
  }

  const firstTableStyle = computed(() => {
    return computeStyle(firstExceedsHalf.value, secondExceedsHalf.value)
  })

  const secondTableStyle = computed(() => {
    return computeStyle(secondExceedsHalf.value, firstExceedsHalf.value)
  })

  return {
    firstTableStyle,
    secondTableStyle,
  }
}
