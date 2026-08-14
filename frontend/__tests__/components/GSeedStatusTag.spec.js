//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { shallowMount } from '@vue/test-utils'

import GConditionStatusTag from '@/components/GConditionStatusTag.vue'
import GSeedStatusTag from '@/components/GSeedStatusTag.vue'

describe('components', () => {
  describe('g-seed-status-tag', () => {
    it('should adapt seed readiness data to the shared condition tag', () => {
      const condition = { type: 'Ready' }
      const wrapper = shallowMount(GSeedStatusTag, {
        props: {
          condition,
          identifier: 'shoot-uid',
          popperPlacement: 'right',
          seedName: 'infra1-seed',
          staleShoot: true,
        },
      })

      expect(wrapper.getComponent(GConditionStatusTag).props()).toMatchObject({
        condition,
        identifier: 'shoot-uid',
        popoverKeyPrefix: 'g-seed-status-tag',
        popperPlacement: 'right',
        resourceName: 'infra1-seed',
        stale: true,
      })
    })
  })
})
