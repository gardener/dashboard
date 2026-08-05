//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { shallowMount } from '@vue/test-utils'

import GTableSearch from '@/components/GTableSearch.vue'

const VTextFieldStub = {
  name: 'VTextField',
  inheritAttrs: false,
  props: {
    modelValue: String,
  },
  emits: ['update:modelValue'],
  template: '<input v-bind="$attrs" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)">',
}

describe('components', () => {
  describe('g-table-search', () => {
    function mountSearch (props = {}) {
      return shallowMount(GTableSearch, {
        props,
        global: {
          stubs: {
            VTextField: VTextFieldStub,
            VTooltip: {
              template: '<div><slot name="activator" :props="{}" /><slot /></div>',
            },
          },
        },
      })
    }

    it('uses the established constrained layout by default', () => {
      const wrapper = mountSearch()

      expect(wrapper.classes()).toContain('g-table-search-field')
      expect(wrapper.classes()).not.toContain('fluid')
    })

    it('exposes fluid layout without changing search events', async () => {
      const wrapper = mountSearch({
        fluid: true,
      })
      const field = wrapper.findComponent(VTextFieldStub)

      expect(wrapper.classes()).toContain('fluid')

      field.vm.$emit('update:modelValue', 'provider:aws')
      await wrapper.vm.$nextTick()
      expect(wrapper.emitted('update:modelValue')).toEqual([['provider:aws']])
    })
  })
})
