//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { computed } from 'vue'
import { useRoute } from 'vue-router'

export function useNamespace (options = {}) {
  const {
    route = useRoute(),
  } = options

  return computed(() => {
    return route.params.namespace ?? route.query.namespace
  })
}
