//
// Copyright (c) 2020 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

import { expect } from 'chai'
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
  const wildcardSelectComponent = wrapper.find(WildcardSelect)

  return wildcardSelectComponent.vm
}

describe('WildcardSelect.vue', function () {
  it('should prefer non wildcard value', function () {
    const wildcardSelect = createWildcardSelecteComponent('Foo')
    const wildcardSelectedValue = wildcardSelect.wildcardSelectedValue
    const wildcardVariablePart = wildcardSelect.wildcardVariablePart
    expect(wildcardSelectedValue.value).to.equal('Foo')
    expect(wildcardSelectedValue.isWildcard).to.be.false
    expect(wildcardVariablePart).to.equal('')
  })

  it('should select start wildcard', function () {
    const wildcardSelect = createWildcardSelecteComponent('TestFoo')
    const wildcardSelectedValue = wildcardSelect.wildcardSelectedValue
    const wildcardVariablePart = wildcardSelect.wildcardVariablePart
    expect(wildcardSelectedValue.value).to.equal('Foo')
    expect(wildcardSelectedValue.isWildcard).to.be.true
    expect(wildcardSelectedValue.startsWithWildcard).to.be.true
    expect(wildcardVariablePart).to.equal('Test')
  })

  it('should select end wildcard', function () {
    const wildcardSelect = createWildcardSelecteComponent('BarTest')
    const wildcardSelectedValue = wildcardSelect.wildcardSelectedValue
    const wildcardVariablePart = wildcardSelect.wildcardVariablePart
    expect(wildcardSelectedValue.value).to.equal('Bar')
    expect(wildcardSelectedValue.isWildcard).to.be.true
    expect(wildcardSelectedValue.endsWithWildcard).to.be.true
    expect(wildcardVariablePart).to.equal('Test')
  })

  it('should select longest match', function () {
    const wildcardSelect = createWildcardSelecteComponent('BarBla')
    const wildcardSelectedValue = wildcardSelect.wildcardSelectedValue
    const wildcardVariablePart = wildcardSelect.wildcardVariablePart
    expect(wildcardSelectedValue.value).to.equal('BarBla')
    expect(wildcardSelectedValue.isWildcard).to.be.false
    expect(wildcardVariablePart).to.equal('')
  })

  it('should select wildcard if inital value is wildcard', function () {
    const wildcardSelect = createWildcardSelecteComponent('Bar*')
    const wildcardSelectedValue = wildcardSelect.wildcardSelectedValue
    const wildcardVariablePart = wildcardSelect.wildcardVariablePart
    expect(wildcardSelectedValue.value).to.equal('Bar')
    expect(wildcardSelectedValue.endsWithWildcard).to.be.true
    expect(wildcardVariablePart).to.equal('')
  })

  it('Should select initial custom wildcard value', function () {
    const wildcardSelect = createWildcardSelecteComponent('*')
    const wildcardSelectedValue = wildcardSelect.wildcardSelectedValue
    const wildcardVariablePart = wildcardSelect.wildcardVariablePart
    expect(wildcardSelectedValue.value).to.equal('')
    expect(wildcardSelectedValue.customWildcard).to.be.true
    expect(wildcardVariablePart).to.equal('')
  })

  it('Should select custom wildcard', function () {
    const wildcardSelect = createWildcardSelecteComponent('RandomValue')
    const wildcardSelectedValue = wildcardSelect.wildcardSelectedValue
    const wildcardVariablePart = wildcardSelect.wildcardVariablePart
    expect(wildcardSelectedValue.value).to.equal('')
    expect(wildcardSelectedValue.customWildcard).to.be.true
    expect(wildcardVariablePart).to.equal('RandomValue')
  })
})
