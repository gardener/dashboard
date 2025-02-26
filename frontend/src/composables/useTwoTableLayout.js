//
// SPDX-FileCopyrightText: 2025 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  computed,
  useTemplateRef,
} from 'vue'
import { useElementSize } from '@vueuse/core'

export function useTwoTableLayout ({
  containerRefName = 'container', // Element containing two vuetify data tables
  itemHeight, // height of table items
  tableHeaderHeight = 40,
  tableFooterHeight = 37,
  yMargins = 90, // combined vertical margins
  noDataHeight = 120, // reserved space in case of no data
  firstTableItemCount,
  secondTableItemCount,
}) {
  const containerRef = useTemplateRef(containerRefName)
  const { height: containerHeight } = useElementSize(containerRef)

  const desiredFirstTableHeight = computed(() => {
    return desiredHeight(firstTableItemCount)
  })

  const desiredSecondTableHeight = computed(() => {
    return desiredHeight(secondTableItemCount)
  })

  const halfAvailableHeight = computed(() => {
    return containerHeight.value / 2 - yMargins
  })

  const firstTableStyles = computed(() => {
    return tableStyles(desiredFirstTableHeight, desiredSecondTableHeight)
  })

  const secondTableStyles = computed(() => {
    return tableStyles(desiredSecondTableHeight, desiredFirstTableHeight)
  })

  function desiredHeight (itemCount) {
    const contentHeight = itemCount.value * itemHeight
    if (contentHeight === 0) {
      return noDataHeight
    }
    return contentHeight + tableHeaderHeight + tableFooterHeight
  }

  function tableStyles (desiredHeight, otherTableDesiredHeight) {
    const additionalHeight = halfAvailableHeight.value - otherTableDesiredHeight.value
    let availableHeight = halfAvailableHeight.value
    if (additionalHeight > 0) {
      availableHeight = availableHeight + additionalHeight
    }
    const height = Math.min(desiredHeight.value, availableHeight)

    return {
      height: `${height}px`,
    }
  }

  return {
    firstTableStyles,
    secondTableStyles,
  }
}
