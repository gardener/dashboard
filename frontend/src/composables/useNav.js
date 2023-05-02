//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { createGlobalState } from '@vueuse/core'
import { computed } from 'vue'
import { useRoute } from 'vue-router'

export const useNav = createGlobalState(() => {
  const route = useRoute()

  const namespace = computed(() => {
    return route.params.namespace ?? route.query.namespace
  })

  const tabs = computed(() => {
    const meta = route.meta ?? {}
    if (typeof meta.tabs === 'function') {
      return meta.tabs(route)
    }
    return meta.tabs
  })

  return {
    namespace,
    tabs,
  }
})
