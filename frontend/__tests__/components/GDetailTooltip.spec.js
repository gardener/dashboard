//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { shallowMount } from '@vue/test-utils'

import GDetailTooltip from '@/components/GDetailTooltip.vue'

describe('components', () => {
  describe('g-detail-tooltip', () => {
    function mountComponent (props = {}, slots = {}) {
      return shallowMount(GDetailTooltip, {
        props: {
          title: 'Details',
          ...props,
        },
        slots,
        global: {
          stubs: {
            'v-tooltip': {
              props: ['activator'],
              template: '<div class="tooltip" :data-activator="activator"><slot name="activator" :props="{}" /><slot /></div>',
            },
            'v-card': {
              template: '<div><slot /></div>',
            },
          },
        },
      })
    }

    it('should render a title and body content', () => {
      const wrapper = mountComponent({}, {
        default: '<span class="body-content">Body</span>',
      })

      expect(wrapper.find('.detail-tooltip-heading').text()).toBe('Details')
      expect(wrapper.find('.body-content').text()).toBe('Body')
      expect(wrapper.find('.detail-tooltip-footer').exists()).toBe(false)
    })

    it('should omit the body container when no body content is provided', () => {
      const wrapper = mountComponent()

      expect(wrapper.find('.detail-tooltip-heading').text()).toBe('Details')
      expect(wrapper.find('.detail-tooltip-body').exists()).toBe(false)
    })

    it('should render optional activator and footer slots', () => {
      const wrapper = mountComponent({}, {
        activator: '<button class="activator">Open</button>',
        footer: '<span class="footer-content">Explanation</span>',
      })

      expect(wrapper.find('.activator').exists()).toBe(true)
      expect(wrapper.find('.footer-content').text()).toBe('Explanation')
    })

    it('should accept positive card widths only', () => {
      const validator = GDetailTooltip.props.width.validator

      expect(validator(320)).toBe(true)
      expect(validator(0)).toBe(false)
      expect(validator(-1)).toBe(false)
    })

    it('should enable hover activation by default', () => {
      expect(GDetailTooltip.props.openOnHover.default).toBe(true)
    })

    it('should support using the parent element as activator', () => {
      const wrapper = mountComponent({ activator: 'parent' })

      expect(wrapper.find('.tooltip').attributes('data-activator')).toBe('parent')
    })
  })
})
