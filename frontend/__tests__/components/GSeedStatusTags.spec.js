//
// SPDX-FileCopyrightText: Copyright Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import { ref } from 'vue'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'

import GConditionStatusTag from '@/components/GConditionStatusTag.vue'
import GConditionStatusTags from '@/components/GConditionStatusTags.vue'
import GSeedStatusTags from '@/components/GSeedStatusTags.vue'

describe('components', () => {
  describe('g-seed-status-tags', () => {
    const lastTransitionTime = 'last-transition-time'

    function mountSeedStatusTags ({
      managedSeedShootConditions,
      seedConditions = [],
    } = {}) {
      return mount(GSeedStatusTags, {
        props: {
          identifier: 'shoot-uid',
        },
        global: {
          plugins: [createTestingPinia({ stubActions: false })],
          provide: {
            'managed-seed-shoot': {
              managedSeedShootConditions: ref(managedSeedShootConditions),
            },
            'seed-item': {
              seedConditions: ref(seedConditions),
              seedName: ref('infra1-seed'),
            },
          },
          stubs: {
            GConditionStatusTag: true,
          },
        },
      })
    }

    function conditionTypes (wrapper) {
      return wrapper.getComponent(GConditionStatusTags)
        .props('conditions')
        .map(({ type }) => type)
    }

    it('should use managed seed shoot conditions when available', () => {
      const wrapper = mountSeedStatusTags({
        seedConditions: [{
          type: 'SeedSystemComponentsHealthy',
          lastTransitionTime,
        }],
        managedSeedShootConditions: [{
          type: 'GardenletReady',
          lastTransitionTime,
        }],
      })

      expect(conditionTypes(wrapper)).toEqual(['GardenletReady'])
    })

    it('should adapt seed readiness data to the shared condition tag', () => {
      const wrapper = mountSeedStatusTags({
        seedConditions: [{
          type: 'SeedSystemComponentsHealthy',
          lastTransitionTime,
        }],
      })

      expect(wrapper.getComponent(GConditionStatusTag).props()).toMatchObject({
        condition: expect.objectContaining({ type: 'SeedSystemComponentsHealthy' }),
        identifier: 'shoot-uid',
        popoverKeyPrefix: 'g-seed-status-tag',
        resourceName: 'infra1-seed',
        stale: false,
      })
    })

    it('should fall back to seed conditions', () => {
      const wrapper = mountSeedStatusTags({
        seedConditions: [{
          type: 'SeedSystemComponentsHealthy',
          lastTransitionTime,
        }],
      })

      expect(conditionTypes(wrapper)).toEqual(['SeedSystemComponentsHealthy'])
    })
  })
})
