//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  computed,
  inject,
} from 'vue'
import { useElementSize } from '@vueuse/core'

const TOOLBAR_HEIGHT = 64
const TABLE_HEADER_HEIGHT = 40
const TABLE_FOOTER_HEIGHT = 37

export function useTwoCardLayout ({
  firstItemCount,
  secondItemCount,
  itemHeight,
}) {
  const mainContainer = inject('mainContainer')
  const { height: containerHeight } = useElementSize(mainContainer)

  function estimatedCardHeight (itemCount) {
    return TOOLBAR_HEIGHT + TABLE_HEADER_HEIGHT + itemCount * itemHeight + TABLE_FOOTER_HEIGHT
  }

  const firstExceedsHalf = computed(() => {
    return estimatedCardHeight(firstItemCount.value) > containerHeight.value / 2
  })

  const secondExceedsHalf = computed(() => {
    return estimatedCardHeight(secondItemCount.value) > containerHeight.value / 2
  })

  const firstCardStyle = computed(() => {
    if (firstExceedsHalf.value && secondExceedsHalf.value) {
      return { flex: '0 1 auto', maxHeight: '50%' }
    }
    if (secondExceedsHalf.value) {
      // Only second exceeds: protect first from shrinking
      return { flex: '0 0 auto' }
    }
    return { flex: '0 1 auto' }
  })

  const secondCardStyle = computed(() => {
    if (firstExceedsHalf.value && secondExceedsHalf.value) {
      return { flex: '0 1 auto', maxHeight: '50%' }
    }
    if (firstExceedsHalf.value) {
      // Only first exceeds: protect second from shrinking
      return { flex: '0 0 auto' }
    }
    return { flex: '0 1 auto' }
  })

  return {
    firstCardStyle,
    secondCardStyle,
  }
}
