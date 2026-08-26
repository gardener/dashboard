//
// SPDX-FileCopyrightText: Copyright Contributors to the Gardener project
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
            RouterLink: {
              props: ['to'],
              template: '<a class="router-link-stub"><slot /></a>',
            },
            'v-chip': {
              template: '<span><slot /></span>',
            },
            'v-icon': true,
          },
        },
      })
    }

    function findRow (wrapper, label) {
      return wrapper.findAll('.health-row').find(item => {
        return item.find('.health-label-text').text() === label
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
      it('should render as a router link when a target is provided', () => {
        const wrapper = mountComponent({
          to: {
            name: 'ShootList',
            query: {
              q: 'seed:"infra1-seed" health:unhealthy',
            },
          },
          shootCount: 10,
          totalUnhealthyShoots: 3,
          matchingUnhealthyShoots: 1,
        })

        expect(wrapper.find('a.router-link-stub').exists()).toBe(true)
        expect(wrapper.find('svg').exists()).toBe(true)
        expect(wrapper.attributes('aria-label')).toContain('View unhealthy shoots for this seed')
      })

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

        const excluded = findRow(wrapper, 'Other unhealthy')
        expect(excluded).toBeUndefined()
      })

      it('should show excluded row when matching differs from total', () => {
        const wrapper = mountComponent({
          shootCount: 10,
          totalUnhealthyShoots: 5,
          matchingUnhealthyShoots: 2,
          activeFilterReasons: ['do not require operator action', 'are progressing'],
        })

        const unhealthy = findRow(wrapper, 'Unhealthy')
        expect(unhealthy.find('strong').text()).toBe('2')
        expect(unhealthy.find('.operations-view-chip').text()).toBe('Operations View')

        const excluded = findRow(wrapper, 'Other unhealthy')
        expect(excluded).toBeDefined()
        expect(excluded.find('strong').text()).toBe('3')
        expect(wrapper.find('.exclusion-description').text()).toBe(
          'Not shown in Operations View because they do not require operator action or are progressing.',
        )
      })

      it('should explain all configured exclusion reasons', () => {
        const wrapper = mountComponent({
          shootCount: 20,
          totalUnhealthyShoots: 10,
          matchingUnhealthyShoots: 4,
          activeFilterReasons: [
            'are progressing',
            'do not require operator action',
            'have only ignored tickets',
          ],
        })

        const excluded = findRow(wrapper, 'Other unhealthy')
        expect(excluded.find('strong').text()).toBe('6')
        expect(wrapper.find('.exclusion-description').text()).toBe(
          'Not shown in Operations View because they are progressing, do not require operator action, or have only ignored tickets.',
        )
      })

      it('should not show excluded row when no filter labels provided', () => {
        const wrapper = mountComponent({
          shootCount: 10,
          totalUnhealthyShoots: 5,
          matchingUnhealthyShoots: 2,
        })

        const excluded = findRow(wrapper, 'Other unhealthy')
        expect(excluded).toBeUndefined()
      })

      it('should show excluded row with 0 count when filters active but nothing excluded', () => {
        const wrapper = mountComponent({
          shootCount: 10,
          totalUnhealthyShoots: 5,
          matchingUnhealthyShoots: 5,
          activeFilterReasons: ['are progressing'],
        })

        const excluded = findRow(wrapper, 'Other unhealthy')
        expect(excluded).toBeDefined()
        expect(excluded.find('strong').text()).toBe('0')
        expect(wrapper.find('.exclusion-description').text()).toBe(
          'Not shown in Operations View because they are progressing.',
        )
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
          activeFilterReasons: ['do not require operator action'],
        })

        const label = wrapper.attributes('aria-label')

        expect(label).toBe([
          'Shoot health distribution',
          '10 shoots',
          '1 unhealthy shoot in Operations View',
          '2 unhealthy shoots outside Operations View because they do not require operator action',
          '7 healthy shoots.',
        ].join(', '))
      })

      it('should pluralize each shoot count correctly', () => {
        const wrapper = mountComponent({
          shootCount: 1,
          totalUnhealthyShoots: 0,
          matchingUnhealthyShoots: 0,
        })

        expect(wrapper.attributes('aria-label')).toBe(
          'Shoot health distribution, 1 shoot, 0 unhealthy shoots, 1 healthy shoot.',
        )
      })

      it('should describe the link purpose in the empty state', () => {
        const wrapper = mountComponent({
          to: { name: 'ShootList' },
          shootCount: 0,
        })

        expect(wrapper.attributes('aria-label')).toBe(
          'View unhealthy shoots for this seed; no shoots are assigned.',
        )
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
