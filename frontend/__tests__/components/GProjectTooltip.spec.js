//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { shallowMount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { h } from 'vue'

import GProjectTooltip from '@/components/GProjectTooltip.vue'

describe('components', () => {
  describe('g-project-tooltip', () => {
    const project = {
      metadata: {
        name: 'example-project',
        creationTimestamp: '2026-07-01T12:00:00Z',
        annotations: {
          'dashboard.gardener.cloud/project-title': 'Example title',
        },
      },
      spec: {
        createdBy: { name: 'creator@example.com' },
        description: 'Example description',
        owner: { name: 'owner@example.com' },
        purpose: 'evaluation',
      },
    }

    function mountComponent (props = {}, slots = {}) {
      return shallowMount(GProjectTooltip, {
        props: {
          project,
          ...props,
        },
        slots: {
          default: '<span class="activator-content">Example project</span>',
          ...slots,
        },
        global: {
          plugins: [createPinia()],
          stubs: {
            GDetailTooltip: {
              props: ['activator'],
              template: '<div class="detail-tooltip" :data-activator="activator"><slot name="activator" :props="{ \'data-tooltip-activator\': \'true\' }" /><slot /><slot name="footer" /></div>',
            },
            GAccountAvatar: {
              props: ['accountName'],
              template: '<span class="account-avatar">{{ accountName }}</span>',
            },
            GTimeString: {
              template: '<span class="time-string" />',
            },
          },
        },
      })
    }

    it('should render project details and creation metadata', () => {
      const wrapper = mountComponent()

      expect(wrapper.find('.activator-content').text()).toBe('Example project')
      expect(wrapper.find('.project-tooltip-activator').attributes('data-tooltip-activator')).toBe('true')
      expect(wrapper.find('.project-tooltip-activator').attributes('tabindex')).toBe('0')
      expect(wrapper.find('.detail-tooltip').attributes('data-activator')).toBeUndefined()
      expect(wrapper.find('.project-details').text()).toContain('Nameexample-project')
      expect(wrapper.find('.project-details').text()).toContain('TitleExample title')
      expect(wrapper.find('.project-details').text()).toContain('DescriptionExample description')
      expect(wrapper.find('.project-details').text()).toContain('Ownerowner@example.com')
      expect(wrapper.find('.project-details').text()).toContain('Purposeevaluation')
      expect(wrapper.find('.project-metadata').text()).toContain('Created bycreator@example.com')
      expect(wrapper.find('.time-string').exists()).toBe(true)
    })

    it('should omit optional project details when empty', () => {
      const wrapper = mountComponent({
        project: {
          metadata: {
            name: 'minimal-project',
            creationTimestamp: '2026-07-01T12:00:00Z',
          },
          spec: {},
        },
      })

      expect(wrapper.find('.project-details').text()).toContain('Nameminimal-project')
      expect(wrapper.find('.project-details').text()).not.toContain('Title')
      expect(wrapper.find('.project-details').text()).not.toContain('Description')
      expect(wrapper.find('.project-details').text()).not.toContain('Purpose')
    })

    it('should allow the activator to be controlled by the consumer', () => {
      const wrapper = mountComponent({}, {
        activator: ({ props }) => h('button', {
          ...props,
          class: 'external-activator',
        }, 'Example project'),
      })

      expect(wrapper.find('.external-activator').attributes('data-tooltip-activator')).toBe('true')
      expect(wrapper.find('.detail-tooltip').attributes('data-activator')).toBeUndefined()
    })

    it('should forward an explicit activator', () => {
      const wrapper = mountComponent({ activator: '#project-row' })

      expect(wrapper.find('.detail-tooltip').attributes('data-activator')).toBe('#project-row')
      expect(wrapper.find('.activator-content').exists()).toBe(false)
    })
  })
})
