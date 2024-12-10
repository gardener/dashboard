//
// SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { computed } from 'vue'
import { createGlobalState } from '@vueuse/core'

export const useIsInIframe = createGlobalState(() => {
  return computed(() => window.self !== window.top)
})
