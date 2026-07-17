//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { shallowMount } from '@vue/test-utils'

import GStatusTagTooltip from '@/components/GStatusTagTooltip.vue'

const { createVuetifyPlugin } = global.fixtures.helper

describe('components', () => {
  describe('g-status-tag-tooltip', () => {
    const vuetifyPlugin = createVuetifyPlugin()

    function mountComponent (props = {}, slots = {}) {
      return shallowMount(GStatusTagTooltip, {
        props: {
          title: 'API Server',
          ...props,
        },
        slots,
        global: {
          plugins: [vuetifyPlugin],
          stubs: {
            GDetailTooltip: {
              props: ['activator', 'title'],
              template: '<div :data-activator="activator"><div class="heading">{{ title }}</div><div v-if="$slots.default" class="body"><slot /></div><div v-if="$slots.footer" class="footer"><slot name="footer" /></div></div>',
            },
            'v-icon': true,
          },
        },
      })
    }

    it('should forward a parent activator prop without wrapping', () => {
      const wrapper = mountComponent({ activator: 'parent' })

      expect(wrapper.find('[data-activator="parent"]').exists()).toBe(true)
      expect(wrapper.find('.activator').exists()).toBe(false)
    })

    it('should render a description in the body when there are no user errors', () => {
      const wrapper = mountComponent({
        description: 'The API server is available.',
      })

      expect(wrapper.find('.status-description').text()).toBe('The API server is available.')
      expect(wrapper.find('.footer').exists()).toBe(false)
    })

    it('should render only the full condition name when no details are configured', () => {
      const wrapper = mountComponent()

      expect(wrapper.find('.heading').text()).toBe('API Server')
      expect(wrapper.find('.body').exists()).toBe(false)
      expect(wrapper.find('.footer').exists()).toBe(false)
    })

    it('should render user error summaries', () => {
      const wrapper = mountComponent({
        description: 'The API server is available.',
        userErrors: [{ shortDescription: 'Configuration problem' }],
      })

      expect(wrapper.find('.user-error-row').text()).toContain('Configuration problem')
      expect(wrapper.find('.user-error-row v-icon-stub').attributes('icon')).toBe('mdi-account-alert-outline')
      expect(wrapper.find('.status-description').exists()).toBe(false)
      expect(wrapper.find('.footer').text()).toBe('The API server is available.')
    })
  })
})
