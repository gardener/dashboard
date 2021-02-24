//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { shallowMount } from '@vue/test-utils'
import WildcardSelect from '@/components/WildcardSelect.vue'
import Vue from 'vue'
import Vuetify from 'vuetify'
import Vuelidate from 'vuelidate'

Vue.use(Vuetify)
Vue.use(Vuelidate)

const sampleWildcardItems = [
  '*Foo',
  'Foo',
  '*',
  'Bar*',
  'BarBla'
]

function createWildcardSelecteComponent (selectedWildcardItem) {
  const propsData = {
    wildcardSelectItems: sampleWildcardItems,
    wildcardSelectLabel: 'FooBar',
    value: selectedWildcardItem
  }
  const wrapper = shallowMount(WildcardSelect, {
    propsData
  })
  const wildcardSelectComponent = wrapper.findComponent(WildcardSelect)

  return wildcardSelectComponent.vm
}

describe('WildcardSelect.vue', () => {
  it('should prefer non wildcard value', () => {
    const wildcardSelect = createWildcardSelecteComponent('Foo')
    const wildcardSelectedValue = wildcardSelect.wildcardSelectedValue
    const wildcardVariablePart = wildcardSelect.wildcardVariablePart
    expect(wildcardSelectedValue.value).toBe('Foo')
    expect(wildcardSelectedValue.isWildcard).toBe(false)
    expect(wildcardVariablePart).toBe('')
  })

  it('should select start wildcard', () => {
    const wildcardSelect = createWildcardSelecteComponent('TestFoo')
    const wildcardSelectedValue = wildcardSelect.wildcardSelectedValue
    const wildcardVariablePart = wildcardSelect.wildcardVariablePart
    expect(wildcardSelectedValue.value).toBe('Foo')
    expect(wildcardSelectedValue.isWildcard).toBe(true)
    expect(wildcardSelectedValue.startsWithWildcard).toBe(true)
    expect(wildcardVariablePart).toBe('Test')
  })

  it('should select end wildcard', () => {
    const wildcardSelect = createWildcardSelecteComponent('BarTest')
    const wildcardSelectedValue = wildcardSelect.wildcardSelectedValue
    const wildcardVariablePart = wildcardSelect.wildcardVariablePart
    expect(wildcardSelectedValue.value).toBe('Bar')
    expect(wildcardSelectedValue.isWildcard).toBe(true)
    expect(wildcardSelectedValue.endsWithWildcard).toBe(true)
    expect(wildcardVariablePart).toBe('Test')
  })

  it('should select longest match', () => {
    const wildcardSelect = createWildcardSelecteComponent('BarBla')
    const wildcardSelectedValue = wildcardSelect.wildcardSelectedValue
    const wildcardVariablePart = wildcardSelect.wildcardVariablePart
    expect(wildcardSelectedValue.value).toBe('BarBla')
    expect(wildcardSelectedValue.isWildcard).toBe(false)
    expect(wildcardVariablePart).toBe('')
  })

  it('should select wildcard if inital value is wildcard', () => {
    const wildcardSelect = createWildcardSelecteComponent('Bar*')
    const wildcardSelectedValue = wildcardSelect.wildcardSelectedValue
    const wildcardVariablePart = wildcardSelect.wildcardVariablePart
    expect(wildcardSelectedValue.value).toBe('Bar')
    expect(wildcardSelectedValue.endsWithWildcard).toBe(true)
    expect(wildcardVariablePart).toBe('')
  })

  it('Should select initial custom wildcard value', () => {
    const wildcardSelect = createWildcardSelecteComponent('*')
    const wildcardSelectedValue = wildcardSelect.wildcardSelectedValue
    const wildcardVariablePart = wildcardSelect.wildcardVariablePart
    expect(wildcardSelectedValue.value).toBe('')
    expect(wildcardSelectedValue.customWildcard).toBe(true)
    expect(wildcardVariablePart).toBe('')
  })

  it('Should select custom wildcard', () => {
    const wildcardSelect = createWildcardSelecteComponent('RandomValue')
    const wildcardSelectedValue = wildcardSelect.wildcardSelectedValue
    const wildcardVariablePart = wildcardSelect.wildcardVariablePart
    expect(wildcardSelectedValue.value).toBe('')
    expect(wildcardSelectedValue.customWildcard).toBe(true)
    expect(wildcardVariablePart).toBe('RandomValue')
  })
})
