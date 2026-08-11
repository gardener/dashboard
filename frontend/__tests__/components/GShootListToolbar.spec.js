//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { shallowMount } from '@vue/test-utils'
import {
  createPinia,
  setActivePinia,
} from 'pinia'

import GShootListToolbar from '@/components/GShootListToolbar.vue'
import GTableColumnSelection from '@/components/GTableColumnSelection.vue'
import GTableSearch from '@/components/GTableSearch.vue'

const { createVuetifyPlugin } = global.fixtures.helper
const tooltipFocus = vi.fn()

// Disable createSharedComposable so each test gets a fresh composable instance
vi.mock('@vueuse/core', async importOriginal => {
  const actual = await importOriginal()
  return {
    ...actual,
    createSharedComposable: fn => fn,
  }
})

const VModelStub = {
  name: 'VSwitch',
  inheritAttrs: false,
  props: {
    modelValue: Boolean,
  },
  emits: ['update:modelValue'],
  template: '<label><input v-bind="$attrs" type="checkbox"><slot name="label" /></label>',
}

const GDetailTooltipStub = {
  name: 'GDetailTooltip',
  props: {
    title: String,
    width: Number,
  },
  setup () {
    return {
      tooltipProps: {
        'aria-describedby': 'focus-mode-tooltip',
        onFocus: tooltipFocus,
      },
    }
  },
  template: '<div><slot name="activator" :props="tooltipProps" /><slot /><slot name="footer" /></div>',
}

describe('components', () => {
  describe('g-shoot-list-toolbar', () => {
    function mountToolbar (props = {}) {
      const pinia = createPinia()
      setActivePinia(pinia)

      return shallowMount(GShootListToolbar, {
        props: {
          modelValue: 'health:unhealthy',
          namespace: '_all',
          issueSinceColumnVisible: true,
          selectableHeaders: [{ key: 'name' }],
          ...props,
        },
        global: {
          plugins: [
            createVuetifyPlugin(),
            pinia,
          ],
          directives: {
            tooltip: () => {},
          },
          stubs: {
            VBadge: {
              template: '<div><slot /></div>',
            },
            VMenu: {
              template: '<div><slot name="activator" :props="{}" /><slot /></div>',
            },
            VSheet: {
              template: '<div><slot /></div>',
            },
            VSwitch: VModelStub,
            GDetailTooltip: GDetailTooltipStub,
          },
        },
      })
    }

    beforeEach(() => {
      window.localStorage.clear()
      tooltipFocus.mockClear()
    })

    it('owns its layout and uses the public fluid search API', () => {
      const wrapper = mountToolbar()
      const search = wrapper.findComponent(GTableSearch)
      const columnSelection = wrapper.findComponent(GTableColumnSelection)

      expect(wrapper.find('.toolbar').exists()).toBe(true)
      expect(search.props('fluid')).toBe(true)
      expect(columnSelection.props('activatorColor')).toBe('toolbar-title')
      expect(columnSelection.props('activatorVariant')).toBe('text')
      expect(wrapper.find('.focus-label').text()).toBe('Focus')
      expect(wrapper.findComponent(GDetailTooltipStub).props()).toMatchObject({
        title: 'Focus mode',
        width: 380,
      })
      expect(wrapper.text()).toContain('Keeps the current cluster list and sorting fixed while cluster data continues to update.')
      expect(wrapper.text()).toContain('New clusters remain hidden')
      expect(wrapper.text()).toContain('Removed clusters appear dimmed')
      expect(wrapper.vm.operationsView.state).toBe('active')
    })

    it('forwards tooltip accessibility props and keyboard focus to the switch control', async () => {
      const wrapper = mountToolbar()
      const switchControl = wrapper.find('input[type="checkbox"]')

      expect(switchControl.attributes('aria-describedby')).toBe('focus-mode-tooltip')
      await switchControl.trigger('focus')
      expect(tooltipFocus).toHaveBeenCalledOnce()
    })

    it.each([
      { description: 'negated-equivalent', modelValue: '-health:healthy', state: 'active' },
      { description: 'zero-term', modelValue: ' \t\n ', state: 'all' },
    ])('classifies a $description search', ({ modelValue, state }) => {
      const wrapper = mountToolbar({ modelValue })

      expect(wrapper.vm.operationsView.state).toBe(state)
    })

    it('uses the toolbar text variant for the create action', () => {
      const wrapper = mountToolbar({
        canCreateShoots: true,
        namespace: 'garden',
        projectScope: true,
      })
      const createButton = wrapper.findAllComponents({ name: 'VBtn' })
        .find(button => button.props('to'))

      expect(createButton.props('color')).toBe('toolbar-title')
      expect(createButton.props('variant')).toBe('text')
      expect(createButton.props('to')).toEqual({
        name: 'NewShoot',
        params: { namespace: 'garden' },
      })
    })

    it('forwards search, focus, and table actions through its public events', async () => {
      const wrapper = mountToolbar({
        modelValue: 'provider:aws',
      })

      wrapper.findComponent(GTableSearch).vm.$emit('update:modelValue', 'seed:local')
      wrapper.vm.showAllClusters()
      wrapper.vm.applyOperationsView()
      wrapper.findComponent(VModelStub).vm.$emit('update:modelValue', true)
      wrapper.findComponent(GTableColumnSelection).vm.$emit('setSelectedHeader', { key: 'name' })
      wrapper.findComponent(GTableColumnSelection).vm.$emit('reset')
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('update:modelValue')).toEqual([['seed:local']])
      expect(wrapper.emitted('setSearch')).toEqual([
        [''],
        ['health:unhealthy'],
      ])
      expect(wrapper.emitted('update:focusMode')).toEqual([[true]])
      expect(wrapper.emitted('setSelectedHeader')).toEqual([[{ key: 'name' }]])
      expect(wrapper.emitted('reset')).toEqual([[]])
    })
  })
})
