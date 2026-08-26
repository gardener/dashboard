//
// SPDX-FileCopyrightText: Copyright Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import { watch } from 'vue'

export function useScrollBar (containerRef) {
  watch(containerRef, value => {
    if (value?.clientHeight) {
      value.scrollTop += 10
      value.scrollTop -= 10
    }
  }, { immediate: true })
}
