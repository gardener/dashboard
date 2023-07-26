//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { mount } from '@vue/test-utils'
import { messagesColor } from '@/directives'

const { createVuetifyPlugin } = global.fixtures.helper

describe('directives', () => {
  describe('v-messages-color', () => {
    const Component = {
      template: `
        <component
          :is="component"
          v-messages-color="{ color }"
          :error-messages="errorMessage"
          hint="test"
          persistent-hint
          :style="cssVars"
        ></component>
      `,
      props: {
        component: {
          type: String,
          required: true,
        },
        color: {
          type: String,
          default: 'default',
        },
        errorMessage: {
          type: String,
        },
      },
      data () {
        return {
          cssVars: {
            '--v-theme-warning': '251,140,0',
            '--v-theme-primary': '11,128,98',
          },
        }
      },
      computed: {
        rgbColor () {
          const rgbValue = this.cssVars[`--v-theme-${this.color}`]
          return rgbValue
            ? 'rgb(' + rgbValue.replace(/,/g, ', ') + ')'
            : ''
        },
      },
    }

    function mountComponent (props) {
      return mount(Component, {
        global: {
          plugins: [
            createVuetifyPlugin(),
          ],
          directives: {
            messagesColor,
          },
        },
        props,
      })
    }

    function findMessagesElement (wrapper) {
      return wrapper.find('.v-messages')
    }

    it('should be able to apply (theme-) color', async () => {
      const wrapper = mountComponent({
        component: 'v-select',
        color: 'warning',
      })

      const colorizerHintElement = findMessagesElement(wrapper)
      expect(colorizerHintElement.element.style.color).toBe(wrapper.vm.rgbColor)

      await wrapper.setProps({
        color: 'primary',
      })
      expect(colorizerHintElement.element.style.color).toBe(wrapper.vm.rgbColor)

      await wrapper.setProps({
        color: 'default',
      })
      expect(colorizerHintElement.element.style.color).toBe('')
    })

    it('should overwrite hint color for v-text-field', () => {
      const wrapper = mountComponent({
        component: 'v-text-field',
        color: 'warning',
      })
      const colorizerHintElement = findMessagesElement(wrapper)
      expect(colorizerHintElement.element.style.color).toBe(wrapper.vm.rgbColor)
    })

    it('should not overwrite error color for v-text-field', () => {
      const wrapper = mountComponent({
        component: 'v-text-field',
        hintColor: 'warning',
        errorMessage: 'invalid',
      })
      const colorizerHintElement = findMessagesElement(wrapper)
      expect(colorizerHintElement.element.style.color).toBe('')
    })

    it('should overwrite hint color for v-select', () => {
      const wrapper = mountComponent({
        component: 'v-select',
        hintColor: 'warning',
      })
      const colorizerHintElement = findMessagesElement(wrapper)
      expect(colorizerHintElement.element.style.color).toBe(wrapper.vm.rgbColor)
    })

    it('should not overwrite error color for v-select', () => {
      const wrapper = mountComponent({
        component: 'v-select',
        hintColor: 'warning',
        errorMessage: 'invalid',
      })
      const colorizerHintElement = findMessagesElement(wrapper)
      expect(colorizerHintElement.element.style.color).toBe('')
    })
  })
})
