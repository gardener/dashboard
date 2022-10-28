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
    'BarBla',
    '*both*'
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
    const { wildcardSelectedValue, wildcardVariablePartPrefix, wildcardVariablePartSuffix } = wrapper.vm
    expect(wildcardSelectedValue.value).toBe('Foo')
    expect(wildcardSelectedValue.isWildcard).toBe(false)
    expect(wildcardVariablePartPrefix).toBe('')
    expect(wildcardVariablePartSuffix).toBe('')
  })

  it('should select start wildcard', () => {
    const wrapper = shallowMountWildcardSelect('TestFoo')
    const { wildcardSelectedValue, wildcardVariablePartPrefix } = wrapper.vm
    expect(wildcardSelectedValue.value).toBe('Foo')
    expect(wildcardSelectedValue.isWildcard).toBe(true)
    expect(wildcardSelectedValue.startsWithWildcard).toBe(true)
    expect(wildcardVariablePartPrefix).toBe('Test')
  })

  it('should select end wildcard', () => {
    const wrapper = shallowMountWildcardSelect('BarTest')
    const { wildcardSelectedValue, wildcardVariablePartSuffix } = wrapper.vm
    expect(wildcardSelectedValue.value).toBe('Bar')
    expect(wildcardSelectedValue.isWildcard).toBe(true)
    expect(wildcardSelectedValue.endsWithWildcard).toBe(true)
    expect(wildcardVariablePartSuffix).toBe('Test')
  })

  it('should select both start+end wildcard', () => {
    const wrapper = shallowMountWildcardSelect('BarbothFoo')
    const { wildcardSelectedValue, wildcardVariablePartPrefix, wildcardVariablePartSuffix } = wrapper.vm
    expect(wildcardSelectedValue.value).toBe('both')
    expect(wildcardSelectedValue.isWildcard).toBe(true)
    expect(wildcardSelectedValue.startsWithWildcard).toBe(true)
    expect(wildcardSelectedValue.endsWithWildcard).toBe(true)
    expect(wildcardVariablePartPrefix).toBe('Bar')
    expect(wildcardVariablePartSuffix).toBe('Foo')
  })

  it('should select longest match', () => {
    const wrapper = shallowMountWildcardSelect('BarBla')
    const { wildcardSelectedValue, wildcardVariablePartSuffix } = wrapper.vm
    expect(wildcardSelectedValue.value).toBe('BarBla')
    expect(wildcardSelectedValue.isWildcard).toBe(false)
    expect(wildcardVariablePartSuffix).toBe('')
  })

  it('should select wildcard if inital value is wildcard', () => {
    const wrapper = shallowMountWildcardSelect('Bar*')
    const { wildcardSelectedValue, wildcardVariablePartSuffix } = wrapper.vm
    expect(wildcardSelectedValue.value).toBe('Bar')
    expect(wildcardSelectedValue.endsWithWildcard).toBe(true)
    expect(wildcardVariablePartSuffix).toBe('')
  })

  it('Should select initial custom wildcard value', () => {
    const wrapper = shallowMountWildcardSelect('*')
    const { wildcardSelectedValue, wildcardVariablePartSuffix } = wrapper.vm
    expect(wildcardSelectedValue.value).toBe('')
    expect(wildcardSelectedValue.customWildcard).toBe(true)
    expect(wildcardVariablePartSuffix).toBe('')
  })

  it('Should select custom wildcard', () => {
    const wrapper = shallowMountWildcardSelect('RandomValue')
    const { wildcardSelectedValue, wildcardVariablePartSuffix } = wrapper.vm
    expect(wildcardSelectedValue.value).toBe('')
    expect(wildcardSelectedValue.customWildcard).toBe(true)
    expect(wildcardVariablePartSuffix).toBe('RandomValue')
  })
})
