//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { mount } from '@vue/test-utils'
import GWildcardSelect from '@/components/GWildcardSelect'

const { createVuetifyPlugin } = global.fixtures.helper

describe('components', () => {
  describe('g-wildcard-select', () => {
    const sampleWildcardItems = [
      '*Foo',
      'Foo',
      '*',
      'Bar*',
      'BarBla',
      '*both*',
    ]

    function mountWildcardSelect (modelValue) {
      return mount(GWildcardSelect, {
        global: {
          plugins: [
            createVuetifyPlugin(),
          ],
        },
        props: {
          wildcardSelectItems: sampleWildcardItems,
          wildcardSelectLabel: 'FooBar',
          modelValue,
        },
      })
    }

    it('should prefer non wildcard value', () => {
      const wrapper = mountWildcardSelect('Foo')
      const { wildcardSelectedValue, wildcardVariablePartPrefix, wildcardVariablePartSuffix } = wrapper.vm
      expect(wildcardSelectedValue.value).toBe('Foo')
      expect(wildcardSelectedValue.isWildcard).toBe(false)
      expect(wildcardVariablePartPrefix).toBe('')
      expect(wildcardVariablePartSuffix).toBe('')
    })

    it('should select start wildcard', () => {
      const wrapper = mountWildcardSelect('TestFoo')
      const { wildcardSelectedValue, wildcardVariablePartPrefix } = wrapper.vm
      expect(wildcardSelectedValue.value).toBe('Foo')
      expect(wildcardSelectedValue.isWildcard).toBe(true)
      expect(wildcardSelectedValue.startsWithWildcard).toBe(true)
      expect(wildcardVariablePartPrefix).toBe('Test')
    })

    it('should select end wildcard', () => {
      const wrapper = mountWildcardSelect('BarTest')
      const { wildcardSelectedValue, wildcardVariablePartSuffix } = wrapper.vm
      expect(wildcardSelectedValue.value).toBe('Bar')
      expect(wildcardSelectedValue.isWildcard).toBe(true)
      expect(wildcardSelectedValue.endsWithWildcard).toBe(true)
      expect(wildcardVariablePartSuffix).toBe('Test')
    })

    it('should select both start+end wildcard', () => {
      const wrapper = mountWildcardSelect('BarbothFoo')
      const { wildcardSelectedValue, wildcardVariablePartPrefix, wildcardVariablePartSuffix } = wrapper.vm
      expect(wildcardSelectedValue.value).toBe('both')
      expect(wildcardSelectedValue.isWildcard).toBe(true)
      expect(wildcardSelectedValue.startsWithWildcard).toBe(true)
      expect(wildcardSelectedValue.endsWithWildcard).toBe(true)
      expect(wildcardVariablePartPrefix).toBe('Bar')
      expect(wildcardVariablePartSuffix).toBe('Foo')
    })

    it('should select longest match', () => {
      const wrapper = mountWildcardSelect('BarBla')
      const { wildcardSelectedValue, wildcardVariablePartSuffix } = wrapper.vm
      expect(wildcardSelectedValue.value).toBe('BarBla')
      expect(wildcardSelectedValue.isWildcard).toBe(false)
      expect(wildcardVariablePartSuffix).toBe('')
    })

    it('should select wildcard if inital value is wildcard', () => {
      const wrapper = mountWildcardSelect('Bar*')
      const { wildcardSelectedValue, wildcardVariablePartSuffix } = wrapper.vm
      expect(wildcardSelectedValue.value).toBe('Bar')
      expect(wildcardSelectedValue.endsWithWildcard).toBe(true)
      expect(wildcardVariablePartSuffix).toBe('')
    })

    it('Should select initial custom wildcard value', () => {
      const wrapper = mountWildcardSelect('*')
      const { wildcardSelectedValue, wildcardVariablePartSuffix } = wrapper.vm
      expect(wildcardSelectedValue.value).toBe('')
      expect(wildcardSelectedValue.customWildcard).toBe(true)
      expect(wildcardVariablePartSuffix).toBe('')
    })

    it('Should select custom wildcard', () => {
      const wrapper = mountWildcardSelect('RandomValue')
      const { wildcardSelectedValue, wildcardVariablePartSuffix } = wrapper.vm
      expect(wildcardSelectedValue.value).toBe('')
      expect(wildcardSelectedValue.customWildcard).toBe(true)
      expect(wildcardVariablePartSuffix).toBe('RandomValue')
    })
  })
})
