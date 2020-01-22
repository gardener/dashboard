//
// Copyright (c) 2019 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file
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
import SelectHintColorizer from '@/components/SelectHintColorizer.vue'
import Vue from 'vue'
import Vuetify from 'vuetify'
Vue.use(Vuetify)

describe('SelectHintColorizer.vue', function () {
  it('should be able to apply classname', function () {
    const propsData = {
      hintColor: 'orange'
    }
    const wrapper = shallowMount(SelectHintColorizer, {
      propsData
    })
    const colorizerComponent = wrapper.find(SelectHintColorizer).vm
    expect(colorizerComponent.$el.className).to.contain('hintColor-orange')

    wrapper.setProps({ hintColor: 'cyan' })
    expect(colorizerComponent.$el.className).to.contain('hintColor-cyan')
    expect(colorizerComponent.$el.className).to.not.contain('hintColor-orange')

    wrapper.setProps({ hintColor: 'default' })
    expect(colorizerComponent.$el.className).to.not.contain('hintColor-cyan')
  })
})
