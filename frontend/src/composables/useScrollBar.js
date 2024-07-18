//
// SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors
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
