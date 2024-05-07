//
// SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { computed } from 'vue'

import { get } from '@/lodash'

export function useShootInfo (shootItem) {
  const shootInfo = computed(() => {
    return get(shootItem.value, 'info', {})
  })

  const seedShootIngressDomain = computed(() => {
    return shootInfo.value.seedShootIngressDomain || ''
  })

  const canLinkToSeed = computed(() => {
    return get(shootInfo.value, 'canLinkToSeed', false)
  })

  return {
    shootInfo,
    seedShootIngressDomain,
    canLinkToSeed,
  }
}
