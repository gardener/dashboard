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
  tableHeaderHeight = 40, // height of table headers
  tableFooterHeight = 37, // height of table footers
  yMargins = 90, // combined vertical margins
  noDataHeight = 120, // reserved space in case of no data
  firstTableItemCount,
  secondTableItemCount,
}) {
  const containerRef = useTemplateRef(containerRefName)
  const { height: containerHeight } = useElementSize(containerRef)

  const desiredFirstTableHeight = computed(() => {
    const contentHeight = firstTableItemCount.value * (itemHeight + 1)
    if (contentHeight === 0) {
      return noDataHeight
    }
    return contentHeight + tableHeaderHeight + tableFooterHeight
  })

  const desiredSecondTableHeight = computed(() => {
    const contentHeight = secondTableItemCount.value * (itemHeight + 1)
    if (contentHeight === 0) {
      return noDataHeight
    }
    return contentHeight + tableHeaderHeight + tableFooterHeight
  })

  const halfAvailableHeight = computed(() => {
    return containerHeight.value / 2 - yMargins
  })

  const firstTableStyles = computed(() => {
    const additionalHeight = halfAvailableHeight.value - desiredSecondTableHeight.value
    let availableHeight = halfAvailableHeight.value
    if (additionalHeight > 0) {
      availableHeight = availableHeight + additionalHeight
    }
    const height = Math.min(desiredFirstTableHeight.value, availableHeight)

    return {
      height: `${height}px`,
    }
  })

  const secondTableStyles = computed(() => {
    const additionalHeight = halfAvailableHeight.value - desiredFirstTableHeight.value
    let availableHeight = halfAvailableHeight.value
    if (additionalHeight > 0) {
      availableHeight = availableHeight + additionalHeight
    }
    const height = Math.min(desiredSecondTableHeight.value, availableHeight)
    return {
      height: `${height}px`,
    }
  })
  return {
    firstTableStyles,
    secondTableStyles,
  }
}
