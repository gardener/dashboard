//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { shallowMount } from '@vue/test-utils'

import GSeedCapacityIndicator from '@/components/Seeds/GSeedCapacityIndicator.vue'

const { createVuetifyPlugin } = global.fixtures.helper

describe('components', () => {
  describe('g-seed-capacity-indicator', () => {
    const vuetifyPlugin = createVuetifyPlugin()

    function mountComponent (props = {}) {
      return shallowMount(GSeedCapacityIndicator, {
        props,
        global: {
          plugins: [vuetifyPlugin],
          stubs: {
            GDetailTooltip: {
              template: '<div><slot /><div v-if="$slots.footer" class="detail-tooltip-footer"><slot name="footer" /></div></div>',
            },
            RouterLink: {
              props: ['to'],
              template: '<a class="router-link-stub"><slot /></a>',
            },
            'v-icon': true,
            'v-progress-linear': true,
          },
        },
      })
    }

    it('should present capacity as compact, aligned metrics', () => {
      const wrapper = mountComponent({
        shootCount: 26,
        allocatableShoots: 250,
      })

      const rows = wrapper.findAll('.metric-row')
      expect(rows).toHaveLength(2)
      expect(rows[0].text()).toContain('Assigned shoots26')
      expect(rows[1].text()).toContain('Allocatable shoots250')
      expect(wrapper.find('.capacity-summary').text()).toContain('10% used')
      expect(wrapper.find('.capacity-summary').text()).toContain('224 remaining')
    })

    it('should explain when allocatable capacity is unknown', () => {
      const wrapper = mountComponent({ shootCount: 26 })

      expect(wrapper.findAll('.metric-row')[1].text()).toContain('Unknown')
      expect(wrapper.find('.capacity-summary').exists()).toBe(false)
      expect(wrapper.find('.detail-tooltip-footer').text()).toBe(
        'This seed does not report its allocatable shoot capacity.',
      )
    })

    it('should report overcommitment while capping the progress bars', () => {
      const wrapper = mountComponent({
        shootCount: 12,
        allocatableShoots: 10,
      })

      expect(wrapper.find('.capacity-summary').text()).toContain('120% used')
      expect(wrapper.find('.capacity-summary').text()).toContain('0 remaining')
      expect(wrapper.find('.activator').attributes('aria-label')).toContain('(120%)')
      const progressBars = wrapper.findAll('v-progress-linear-stub')
      expect(progressBars).toHaveLength(2)
      for (const progressBar of progressBars) {
        expect(progressBar.attributes('modelvalue')).toBe('100')
      }
    })
  })
})
