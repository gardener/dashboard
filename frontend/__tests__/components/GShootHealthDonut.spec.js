//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { shallowMount } from '@vue/test-utils'

import GShootHealthDonut from '@/components/GShootHealthDonut.vue'

const { createVuetifyPlugin } = global.fixtures.helper

describe('components', () => {
  describe('g-shoot-health-donut', () => {
    const vuetifyPlugin = createVuetifyPlugin()

    function mountComponent (props = {}) {
      return shallowMount(GShootHealthDonut, {
        props,
        global: {
          plugins: [vuetifyPlugin],
          stubs: {
            GDetailTooltip: {
              template: '<div><slot /><slot name="footer" /></div>',
            },
            'v-card': {
              template: '<div><slot /></div>',
            },
            'v-icon': true,
          },
        },
      })
    }

    function findRow (wrapper, label) {
      return wrapper.findAll('.health-row').find(item => {
        return item.find('span').text() === label
      })
    }

    describe('empty state', () => {
      it('should show a dash when shootCount is 0', () => {
        const wrapper = mountComponent({ shootCount: 0 })

        expect(wrapper.find('.text-medium-emphasis').exists()).toBe(true)
        expect(wrapper.find('.text-medium-emphasis').text()).toBe('-')
        expect(wrapper.find('svg').exists()).toBe(false)
      })

      it('should show a dash when shootCount is not provided', () => {
        const wrapper = mountComponent()

        expect(wrapper.find('.text-medium-emphasis').exists()).toBe(true)
      })
    })

    describe('donut rendering', () => {
      it('should render an SVG when there are shoots', () => {
        const wrapper = mountComponent({
          shootCount: 10,
          totalUnhealthyShoots: 3,
          matchingUnhealthyShoots: 1,
        })

        expect(wrapper.find('.empty').exists()).toBe(false)
        expect(wrapper.find('svg').exists()).toBe(true)
      })

      it('should render base segments for unhealthy and healthy', () => {
        const wrapper = mountComponent({
          shootCount: 10,
          totalUnhealthyShoots: 4,
          matchingUnhealthyShoots: 2,
        })

        const segments = wrapper.findAll('circle.segment')
        const keys = segments.map(s => {
          if (s.classes().includes('matching')) {
            return 'matching'
          }
          if (s.classes().includes('unhealthy')) {
            return 'unhealthy'
          }
          if (s.classes().includes('healthy')) {
            return 'healthy'
          }
          return 'unknown'
        })

        expect(keys).toContain('unhealthy')
        expect(keys).toContain('healthy')
        expect(keys).toContain('matching')
      })

      it('should not render overlay segment when matching is 0', () => {
        const wrapper = mountComponent({
          shootCount: 10,
          totalUnhealthyShoots: 3,
          matchingUnhealthyShoots: 0,
        })

        const segments = wrapper.findAll('circle.segment')
        const keys = segments.map(s => {
          if (s.classes().includes('matching')) {
            return 'matching'
          }
          if (s.classes().includes('unhealthy')) {
            return 'unhealthy'
          }
          if (s.classes().includes('healthy')) {
            return 'healthy'
          }
          return 'unknown'
        })

        expect(keys).not.toContain('matching')
        expect(keys).toContain('unhealthy')
        expect(keys).toContain('healthy')
      })

      it('should render all healthy when no unhealthy shoots', () => {
        const wrapper = mountComponent({
          shootCount: 5,
          totalUnhealthyShoots: 0,
          matchingUnhealthyShoots: 0,
        })

        const segments = wrapper.findAll('circle.segment')

        expect(segments).toHaveLength(1)
        expect(segments[0].classes()).toContain('healthy')
      })
    })

    describe('center text', () => {
      it('should show the matching unhealthy count', () => {
        const wrapper = mountComponent({
          shootCount: 10,
          totalUnhealthyShoots: 5,
          matchingUnhealthyShoots: 3,
        })

        const text = wrapper.find('.center-text')
        expect(text.text()).toBe('3')
      })

      it('should show 0 when no matching unhealthy', () => {
        const wrapper = mountComponent({
          shootCount: 10,
          totalUnhealthyShoots: 0,
          matchingUnhealthyShoots: 0,
        })

        const text = wrapper.find('.center-text')
        expect(text.text()).toBe('0')
      })

      it('should use compact format for values >= 1000', () => {
        const wrapper = mountComponent({
          shootCount: 2000,
          totalUnhealthyShoots: 1500,
          matchingUnhealthyShoots: 1500,
        })

        const text = wrapper.find('.center-text')
        expect(text.text()).toBe('1.5k')
        expect(text.classes()).toContain('compact')
      })

      it('should use small class for values >= 100', () => {
        const wrapper = mountComponent({
          shootCount: 500,
          totalUnhealthyShoots: 150,
          matchingUnhealthyShoots: 150,
        })

        const text = wrapper.find('.center-text')
        expect(text.text()).toBe('150')
        expect(text.classes()).toContain('small')
      })

      it('should have error class when matching unhealthy > 0', () => {
        const wrapper = mountComponent({
          shootCount: 10,
          totalUnhealthyShoots: 3,
          matchingUnhealthyShoots: 2,
        })

        expect(wrapper.find('.center-text').classes()).toContain('error')
      })

      it('should not have error class when matching unhealthy is 0', () => {
        const wrapper = mountComponent({
          shootCount: 10,
          totalUnhealthyShoots: 0,
          matchingUnhealthyShoots: 0,
        })

        expect(wrapper.find('.center-text').classes()).not.toContain('error')
      })
    })

    describe('tooltip legend', () => {
      it('should show matching count when matching equals total', () => {
        const wrapper = mountComponent({
          shootCount: 10,
          totalUnhealthyShoots: 5,
          matchingUnhealthyShoots: 5,
        })

        const unhealthy = findRow(wrapper, 'Unhealthy')
        expect(unhealthy).toBeDefined()
        expect(unhealthy.find('strong').text()).toBe('5')

        const excluded = findRow(wrapper, 'Unhealthy filtered out')
        expect(excluded).toBeUndefined()
      })

      it('should show excluded row when matching differs from total', () => {
        const wrapper = mountComponent({
          shootCount: 10,
          totalUnhealthyShoots: 5,
          matchingUnhealthyShoots: 2,
          activeFilterLabels: ['User Errors', 'Progressing'],
        })

        const unhealthy = findRow(wrapper, 'Unhealthy shown')
        expect(unhealthy.find('strong').text()).toBe('2')

        const excluded = findRow(wrapper, 'Unhealthy filtered out')
        expect(excluded).toBeDefined()
        expect(excluded.find('strong').text()).toBe('3')
        expect(wrapper.find('.filter-summary').text()).toContain('User Errors, Progressing')
      })

      it('should truncate filter labels after 2 with "& N more"', () => {
        const wrapper = mountComponent({
          shootCount: 20,
          totalUnhealthyShoots: 10,
          matchingUnhealthyShoots: 4,
          activeFilterLabels: ['Progressing', 'User Errors', 'Deactivated Reconciliation', 'Ignored Ticket Labels'],
        })

        const excluded = findRow(wrapper, 'Unhealthy filtered out')
        expect(excluded.find('strong').text()).toBe('6')
        expect(wrapper.find('.filter-summary').text()).toContain('Progressing, User Errors & 2 more')
      })

      it('should not show excluded row when no filter labels provided', () => {
        const wrapper = mountComponent({
          shootCount: 10,
          totalUnhealthyShoots: 5,
          matchingUnhealthyShoots: 2,
        })

        const excluded = findRow(wrapper, 'Unhealthy filtered out')
        expect(excluded).toBeUndefined()
      })

      it('should show excluded row with 0 count when filters active but nothing excluded', () => {
        const wrapper = mountComponent({
          shootCount: 10,
          totalUnhealthyShoots: 5,
          matchingUnhealthyShoots: 5,
          activeFilterLabels: ['Progressing'],
        })

        const excluded = findRow(wrapper, 'Unhealthy filtered out')
        expect(excluded).toBeDefined()
        expect(excluded.find('strong').text()).toBe('0')
        expect(wrapper.find('.filter-summary').text()).toContain('Progressing')
      })

      it('should show healthy legend when there are healthy shoots', () => {
        const wrapper = mountComponent({
          shootCount: 10,
          totalUnhealthyShoots: 3,
          matchingUnhealthyShoots: 1,
        })

        const healthy = findRow(wrapper, 'Healthy')
        expect(healthy).toBeDefined()
        expect(healthy.find('strong').text()).toBe('7')
      })
    })

    describe('accessibility', () => {
      it('should have a descriptive aria-label on the root', () => {
        const wrapper = mountComponent({
          shootCount: 10,
          totalUnhealthyShoots: 3,
          matchingUnhealthyShoots: 1,
          activeFilterLabels: ['User Errors'],
        })

        const label = wrapper.attributes('aria-label')

        expect(label).toContain('Shoot health distribution')
        expect(label).toContain('10 shoots')
        expect(label).toContain('1 unhealthy shoot')
        expect(label).toContain('2 unhealthy shoots excluded by Cluster Operations filters (User Errors)')
        expect(label).toContain('7 healthy shoots')
      })
    })

    describe('prop validators', () => {
      it('should reject negative shootCount', () => {
        const shootCountProp = GShootHealthDonut.props.shootCount
        expect(shootCountProp.validator(-1)).toBe(false)
      })

      it('should reject non-integer shootCount', () => {
        const shootCountProp = GShootHealthDonut.props.shootCount
        expect(shootCountProp.validator(1.5)).toBe(false)
      })

      it('should accept valid shootCount', () => {
        const shootCountProp = GShootHealthDonut.props.shootCount
        expect(shootCountProp.validator(0)).toBe(true)
        expect(shootCountProp.validator(10)).toBe(true)
      })

      it('should reject negative totalUnhealthyShoots', () => {
        const prop = GShootHealthDonut.props.totalUnhealthyShoots
        expect(prop.validator(-1)).toBe(false)
      })

      it('should reject non-integer totalUnhealthyShoots', () => {
        const prop = GShootHealthDonut.props.totalUnhealthyShoots
        expect(prop.validator(1.5)).toBe(false)
      })

      it('should accept valid totalUnhealthyShoots', () => {
        const prop = GShootHealthDonut.props.totalUnhealthyShoots
        expect(prop.validator(0)).toBe(true)
        expect(prop.validator(5)).toBe(true)
      })

      it('should reject negative matchingUnhealthyShoots', () => {
        const prop = GShootHealthDonut.props.matchingUnhealthyShoots
        expect(prop.validator(-1)).toBe(false)
      })

      it('should reject non-integer matchingUnhealthyShoots', () => {
        const prop = GShootHealthDonut.props.matchingUnhealthyShoots
        expect(prop.validator(1.5)).toBe(false)
      })

      it('should accept valid matchingUnhealthyShoots', () => {
        const prop = GShootHealthDonut.props.matchingUnhealthyShoots
        expect(prop.validator(0)).toBe(true)
        expect(prop.validator(3)).toBe(true)
      })
    })
  })
})
