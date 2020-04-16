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
import { mount } from '@vue/test-utils'
import HintColorizer from '@/components/HintColorizer.vue'
import Vue from 'vue'
import Vuetify from 'vuetify'
import { VSelect, VTextField } from 'vuetify/lib'
Vue.use(Vuetify)

// see issue https://github.com/vuejs/vue-test-utils/issues/974#issuecomment-423721358
global.requestAnimationFrame = cb => cb()

describe('HintColorizer.vue', function () {
  let vuetify

  beforeEach(() => {
    vuetify = new Vuetify()
  })

  it('should be able to apply classname', async function () {
    const propsData = {
      hintColor: 'orange'
    }
    const wrapper = mount(HintColorizer, {
      vuetify,
      propsData
    })
    const colorizerComponent = wrapper.find(HintColorizer).vm
    expect(colorizerComponent.$el.className).to.contain('hintColor-orange')

    wrapper.setProps({ hintColor: 'cyan' })

    await Vue.nextTick()
    expect(colorizerComponent.$el.className).to.contain('hintColor-cyan')
    expect(colorizerComponent.$el.className).to.not.contain('hintColor-orange')

    wrapper.setProps({ hintColor: 'default' })

    await Vue.nextTick()
    expect(colorizerComponent.$el.className).to.not.contain('hintColor-cyan')
  })

  it('should not overwrite error color class for v-text-field', async function () {
    const data = () => {
      return {
        errorMessage: undefined
      }
    }
    const template = '<hint-colorizer hintColor="orange" ref="hintColorizer"><v-text-field :error-messages="errorMessage"></v-text-field></hint-colorizer>'
    const wrapper = mount({ template, data, components: { HintColorizer } }, { vuetify })
    const { hintColorizer } = wrapper.vm.$refs

    expect(hintColorizer.$el.className).to.contain('hintColor-orange')

    wrapper.setData({ errorMessage: 'invalid' })

    await Vue.nextTick()
    expect(hintColorizer.$el.className).to.not.contain('hintColor-orange')
  })

  it('should not overwrite error color class for v-select', async function () {
    const data = () => {
      return {
        errorMessage: undefined
      }
    }
    const template = '<hint-colorizer hintColor="orange" ref="hintColorizer"><v-select :error-messages="errorMessage"></v-select></hint-colorizer>'
    const wrapper = mount({ template, data, components: { HintColorizer } }, { vuetify })
    const { hintColorizer } = wrapper.vm.$refs

    expect(hintColorizer.$el.className).to.contain('hintColor-orange')

    wrapper.setData({ errorMessage: 'invalid' })

    await Vue.nextTick()
    expect(hintColorizer.$el.className).to.not.contain('hintColor-orange')
  })
})

describe('VSelect', function () {
  let vuetify

  beforeEach(() => {
    vuetify = new Vuetify()
  })

  it('should be able to overwrite v-select hint color class', function () {
    const hint = 'hint test'
    const propsData = {
      hint,
      'persistent-hint': true
    }
    const wrapper = mount(VSelect, {
      vuetify,
      propsData
    })
    const hintElement = wrapper.find('.v-messages__wrapper > .v-messages__message')
    expect(hintElement.text()).to.equal(hint)
  })
})

describe('VTextField', function () {
  let vuetify

  beforeEach(() => {
    vuetify = new Vuetify()
  })

  it('should be able to overwrite v-text-field hint color class', function () {
    const hint = 'hint test'
    const propsData = {
      hint,
      'persistent-hint': true
    }
    const wrapper = mount(VTextField, {
      vuetify,
      propsData
    })
    const hintElement = wrapper.find('.v-messages__wrapper > .v-messages__message')
    expect(hintElement.text()).to.equal(hint)
  })
})
