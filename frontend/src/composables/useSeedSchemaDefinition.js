//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  createGlobalState,
  computedAsync,
} from '@vueuse/core'

import { useApi } from '@/composables/useApi'

export const useSeedSchemaDefinition = createGlobalState((options = {}) => {
  const {
    api = useApi(),
  } = options
  return computedAsync(api.getSeedSchemaDefinition, null)
})
