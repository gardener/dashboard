//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  createGlobalState,
  computedAsync,
} from '@vueuse/core'

import { useApi } from '@/composables/useApi'

export const useShootSchemaDefinition = createGlobalState((options = {}) => {
  const {
    api = useApi(),
  } = options
  return computedAsync(api.getShootSchemaDefinition, null)
})
