//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

// Libraries
import Vuetify from 'vuetify'
import Vuelidate from 'vuelidate'

// Components
import WildcardSelect from '@/components/WildcardSelect'

// Utilities
import { createLocalVue, shallowMount } from '@vue/test-utils'

describe('WildcardSelect.vue', () => {
  const localVue = createLocalVue()
  localVue.use(Vuetify)
  localVue.use(Vuelidate)

  let vuetify

  const sampleWildcardItems = [
    '*Foo',
    'Foo',
    '*',
    'Bar*',
    'BarBla'
  ]

  const shallowMountWildcardSelect = value => {
    return shallowMount(WildcardSelect, {
      localVue,
      vuetify,
      propsData: {
        wildcardSelectItems: sampleWildcardItems,
        wildcardSelectLabel: 'FooBar',
        value
      }
    })
  }

  beforeEach(() => {
    vuetify = new Vuetify()
  })

  it('should prefer non wildcard value', () => {
    const wrapper = shallowMountWildcardSelect('Foo')
    const { wildcardSelectedValue, wildcardVariablePart } = wrapper.vm
    expect(wildcardSelectedValue.value).toBe('Foo')
    expect(wildcardSelectedValue.isWildcard).toBe(false)
    expect(wildcardVariablePart).toBe('')
  })

  it('should select start wildcard', () => {
    const wrapper = shallowMountWildcardSelect('TestFoo')
    const { wildcardSelectedValue, wildcardVariablePart } = wrapper.vm
    expect(wildcardSelectedValue.value).toBe('Foo')
    expect(wildcardSelectedValue.isWildcard).toBe(true)
    expect(wildcardSelectedValue.startsWithWildcard).toBe(true)
    expect(wildcardVariablePart).toBe('Test')
  })

  it('should select end wildcard', () => {
    const wrapper = shallowMountWildcardSelect('BarTest')
    const { wildcardSelectedValue, wildcardVariablePart } = wrapper.vm
    expect(wildcardSelectedValue.value).toBe('Bar')
    expect(wildcardSelectedValue.isWildcard).toBe(true)
    expect(wildcardSelectedValue.endsWithWildcard).toBe(true)
    expect(wildcardVariablePart).toBe('Test')
  })

  it('should select longest match', () => {
    const wrapper = shallowMountWildcardSelect('BarBla')
    const { wildcardSelectedValue, wildcardVariablePart } = wrapper.vm
    expect(wildcardSelectedValue.value).toBe('BarBla')
    expect(wildcardSelectedValue.isWildcard).toBe(false)
    expect(wildcardVariablePart).toBe('')
  })

  it('should select wildcard if inital value is wildcard', () => {
    const wrapper = shallowMountWildcardSelect('Bar*')
    const { wildcardSelectedValue, wildcardVariablePart } = wrapper.vm
    expect(wildcardSelectedValue.value).toBe('Bar')
    expect(wildcardSelectedValue.endsWithWildcard).toBe(true)
    expect(wildcardVariablePart).toBe('')
  })

  it('Should select initial custom wildcard value', () => {
    const wrapper = shallowMountWildcardSelect('*')
    const { wildcardSelectedValue, wildcardVariablePart } = wrapper.vm
    expect(wildcardSelectedValue.value).toBe('')
    expect(wildcardSelectedValue.customWildcard).toBe(true)
    expect(wildcardVariablePart).toBe('')
  })

  it('Should select custom wildcard', () => {
    const wrapper = shallowMountWildcardSelect('RandomValue')
    const { wildcardSelectedValue, wildcardVariablePart } = wrapper.vm
    expect(wildcardSelectedValue.value).toBe('')
    expect(wildcardSelectedValue.customWildcard).toBe(true)
    expect(wildcardVariablePart).toBe('RandomValue')
  })
})
