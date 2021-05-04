//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

// Libraries
import Vuetify from 'vuetify'

// Components
import HintColorizer from '@/components/HintColorizer'

// Utilities
import { createLocalVue, mount } from '@vue/test-utils'

describe('HintColorizer.vue', () => {
  const localVue = createLocalVue()
  let vuetify

  const selector = '.v-messages__message'
  const findHintElement = wrapper => wrapper.find(selector)

  beforeEach(() => {
    vuetify = new Vuetify()
  })

  const Component = {
    template: `
      <hint-colorizer :hint-color="hintColor">
        <component
          :is="component"
          :error-messages="errorMessage"
          hint="test"
          persistent-hint
        >
        </component>
      </hint-colorizer>
      `,
    props: {
      component: {
        type: String,
        required: true
      },
      hintColor: {
        type: String,
        default: 'default'
      },
      errorMessage: {
        type: String
      }
    },
    components: { HintColorizer }
  }

  it('should be able to apply (theme-) color', async () => {
    const wrapper = mount(Component, {
      localVue,
      vuetify,
      propsData: {
        component: 'v-select',
        hintColor: 'warning'
      }
    })
    const colorizerHintElement = findHintElement(wrapper)
    const previousColor = colorizerHintElement.element.style.color
    expect(colorizerHintElement.element.style.color).toMatch(/rgb\(\d+, \d+, \d+\)/) // check that color has been replaced by color value from theme

    await wrapper.setProps({
      hintColor: 'primary'
    })
    expect(colorizerHintElement.element.style.color).toMatch(/rgb\(\d+, \d+, \d+\)/) // check that color has been replaced by color value from theme
    expect(colorizerHintElement.element.style.color).not.toBe(previousColor) // check that color value has been changed

    await wrapper.setProps({
      hintColor: 'default'
    })
    expect(colorizerHintElement.element.style.color).toBe('')
  })

  it('should not overwrite error color for v-text-field', async () => {
    let wrapper
    let colorizerHintElement
    wrapper = mount(Component, {
      localVue,
      vuetify,
      propsData: {
        component: 'v-text-field',
        hintColor: 'warning'
      }
    })
    colorizerHintElement = findHintElement(wrapper)
    expect(colorizerHintElement.element.style.color).toMatch(/rgb\(\d+, \d+, \d+\)/) // check that color has been replaced by color value from theme
    wrapper = mount(Component, {
      localVue,
      vuetify,
      propsData: {
        component: 'v-text-field',
        hintColor: 'warning',
        errorMessage: 'invalid'
      }
    })
    colorizerHintElement = findHintElement(wrapper)
    expect(colorizerHintElement.element.style.color).toBe('') // check that color has not been set
  })

  it('should not overwrite error color for v-select', async () => {
    let wrapper
    let colorizerHintElement
    wrapper = mount(Component, {
      localVue,
      vuetify,
      propsData: {
        component: 'v-select',
        hintColor: 'warning'
      }
    })
    colorizerHintElement = findHintElement(wrapper)
    expect(colorizerHintElement.element.style.color).toMatch(/rgb\(\d+, \d+, \d+\)/) // check that color has been replaced by color value from theme
    wrapper = mount(Component, {
      localVue,
      vuetify,
      propsData: {
        component: 'v-select',
        hintColor: 'warning',
        errorMessage: 'invalid'
      }
    })
    colorizerHintElement = findHintElement(wrapper)
    expect(colorizerHintElement.element.style.color).toBe('') // check that color has not been set
  })
})
