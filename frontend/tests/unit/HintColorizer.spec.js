//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { mount } from '@vue/test-utils'
import HintColorizer from '@/components/HintColorizer.vue'
import Vue from 'vue'
import Vuetify from 'vuetify'
import { VSelect, VTextField } from 'vuetify/lib'
Vue.use(Vuetify)

// see issue https://github.com/vuejs/vue-test-utils/issues/974#issuecomment-423721358
global.requestAnimationFrame = cb => cb()

describe('HintColorizer.vue', () => {
  let vuetify

  beforeEach(() => {
    vuetify = new Vuetify()
  })

  const findHintElement = (wrapper) => {
    return wrapper.find('.v-messages__message')
  }

  it('should be able to apply (theme-) color', async () => {
    const template = '<hint-colorizer hint-color="warning"><v-select hint="test" persistent-hint></v-select></hint-colorizer>'
    const wrapper = mount({
      template,
      vuetify,
      components: { HintColorizer }
    })

    const colorizerHintElement = findHintElement(wrapper)
    expect(colorizerHintElement.element.style.color).toMatch(/rgb\(\d+, \d+, \d+\)/) // check that color has been replaced by color value from theme
    const color = colorizerHintElement.element.style.color

    wrapper.findComponent(HintColorizer).setProps({ hintColor: 'primary' })

    await Vue.nextTick()
    expect(colorizerHintElement.element.style.color).toMatch(/rgb\(\d+, \d+, \d+\)/) // check that color has been replaced by color value from theme
    expect(color).not.toBe(colorizerHintElement.element.style.color) // check that color value has been changed

    wrapper.findComponent(HintColorizer).setProps({ hintColor: 'default' })

    await Vue.nextTick()
    expect(colorizerHintElement.element.style.color).toBe('')
  })

  it('should not overwrite error color for v-text-field', async () => {
    let data = () => {
      return {
        errorMessage: undefined
      }
    }
    const template = '<hint-colorizer hintColor="warning" ref="hintColorizer"><v-text-field :error-messages="errorMessage" hint="test" persistent-hint></v-text-field></hint-colorizer>'
    let wrapper = mount({ template, data, components: { HintColorizer } }, {
      vuetify
    })
    let colorizerHintElement = findHintElement(wrapper)
    expect(colorizerHintElement.element.style.color).toMatch(/rgb\(\d+, \d+, \d+\)/) // check that color has been replaced by color value from theme

    data = () => {
      return {
        errorMessage: 'invalid'
      }
    }
    wrapper = mount({ template, data, components: { HintColorizer } }, {
      vuetify
    })
    colorizerHintElement = findHintElement(wrapper)
    expect(colorizerHintElement.element.style.color).toBe('') // check that color has not been set
  })

  it('should not overwrite error color for v-select', async () => {
    let data = () => {
      return {
        errorMessage: undefined
      }
    }
    const template = '<hint-colorizer hintColor="warning" ref="hintColorizer"><v-select :error-messages="errorMessage" hint="test" persistent-hint></v-select></hint-colorizer>'
    let wrapper = mount({ template, data, components: { HintColorizer } }, {
      vuetify
    })
    let colorizerHintElement = findHintElement(wrapper)
    expect(colorizerHintElement.element.style.color).toMatch(/rgb\(\d+, \d+, \d+\)/) // check that color has been replaced by color value from theme

    data = () => {
      return {
        errorMessage: 'invalid'
      }
    }
    wrapper = mount({ template, data, components: { HintColorizer } }, {
      vuetify
    })
    colorizerHintElement = findHintElement(wrapper)
    expect(colorizerHintElement.element.style.color).toBe('') // check that color has not been set
  })
})

describe('VSelect', () => {
  let vuetify

  beforeEach(() => {
    vuetify = new Vuetify()
  })

  it('should be able to find v-select hint element', () => {
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
    expect(hintElement.text()).toBe(hint)
  })
})

describe('VTextField', () => {
  let vuetify

  beforeEach(() => {
    vuetify = new Vuetify()
  })

  it('should be able to find v-text-field hint element', () => {
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
    expect(hintElement.text()).toBe(hint)
  })
})
