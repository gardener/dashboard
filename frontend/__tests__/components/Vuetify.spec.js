//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'

const { createVuetifyPlugin } = global.fixtures.helper

describe('components', () => {
  describe('v-application', () => {
    function mountApplication (props = {}) {
      const Component = {
        template: `<v-app>
          <v-main>
            <div class="g-main__wrap">{{ text }}</div>
          </v-main>
        </v-app>`,
        props: {
          text: {
            type: String,
            default: 'test',
          },
        },
      }
      return mount(Component, {
        global: {
          plugins: [
            createVuetifyPlugin(),
          ],
        },
        props,
      })
    }
    it('class `v-application__wrap` should exist', () => {
      const wrapper = mountApplication()
      expect(wrapper.find('.v-application > .v-application__wrap').exists()).toBe(true)
    })

    it('class `g-main__wrap` should exist', async () => {
      const text = 'test'
      const wrapper = mountApplication({ text })
      await nextTick()

      expect(wrapper.find('.v-main > div[class$=\'wrap\']').text()).toBe(text)
    })

    it('should apply theme classes to application', () => {
      const wrapper = mountApplication()
      expect(wrapper.classes()).toContain('v-theme--light')
    })
  })

  describe('v-messages', () => {
    const hint = 'test'
    const selector = '.v-input__details > .v-messages > .v-messages__message'

    function mountComponent (props) {
      const Component = {
        template: `<component
          :is="component"
          :hint="hint"
          persistent-hint
        ></component>`,
        props: {
          component: {
            type: String,
            required: true,
          },
          hint: {
            type: String,
            required: true,
          },
        },
      }
      return mount(Component, {
        global: {
          plugins: [
            createVuetifyPlugin(),
          ],
        },
        props,
      })
    }

    it('should be able to find v-select messages element', () => {
      const wrapper = mountComponent({
        component: 'v-select',
        hint,
      })
      expect(wrapper.find(selector).text()).toBe(hint)
    })

    it('should be able to find v-text-field messages element', () => {
      const wrapper = mountComponent({
        component: 'v-text-field',
        hint,
      })
      expect(wrapper.find(selector).text()).toBe(hint)
    })

    it('should be able to find v-autocomplete messages element', () => {
      const wrapper = mountComponent({
        component: 'v-autocomplete',
        hint,
      })
      expect(wrapper.find(selector).text()).toBe(hint)
    })
  })

  describe('v-textarea', () => {
    it('Ensure .v-input__control exists for v-textarea', () => {
      const Component = {
        template: '<v-textarea />',
      }
      const wrapper = mount(Component, {
        global: {
          plugins: [
            createVuetifyPlugin(),
          ],
        },
      })
      expect(wrapper.find('.v-input__control').exists()).toBe(true)
    })
  })

  describe('v-data-table-virtual', () => {
    it('should be able to find v-table__wrapper element', () => {
      const Component = {
        template: '<v-data-table-virtual />',
      }
      const wrapper = mount(Component, {
        global: {
          plugins: [
            createVuetifyPlugin(),
          ],
        },
      })
      const footer = wrapper.find('.v-table__wrapper')
      expect(footer.exists()).toBe(true)
    })
  })

  describe('v-data-table', () => {
    it('should be able to find v-data-table-footer classes', () => {
      const Component = {
        template: '<v-data-table />',
      }
      const wrapper = mount(Component, {
        global: {
          plugins: [
            createVuetifyPlugin(),
          ],
        },
      })
      const footer = wrapper.find('.v-data-table-footer')
      expect(footer.exists()).toBe(true)
      const footerInfo = wrapper.find('.v-data-table-footer__info')
      expect(footerInfo.exists()).toBe(true)
    })
  })

  describe('v-breadcrumbs', () => {
    it('should be able to find v-breadcrumbs-item v-breadcrumbs-item--disabled class', () => {
      const Component = {
        template: '<v-breadcrumbs><v-breadcrumbs-item disabled>test</v-breadcrumbs-item></v-breadcrumbs>',
      }
      const wrapper = mount(Component, {
        global: {
          plugins: [
            createVuetifyPlugin(),
          ],
        },
      })
      const breadcrumbsItem = wrapper.find('.v-breadcrumbs-item')
      expect(breadcrumbsItem.exists()).toBe(true)
      expect(breadcrumbsItem.classes()).toContain('v-breadcrumbs-item--disabled')
    })
  })

  describe('v-btn', () => {
    it('should be able to find v-btn icon class', () => {
      const Component = {
        template: '<v-btn icon="mdi-foo" />',
      }
      const wrapper = mount(Component, {
        global: {
          plugins: [
            createVuetifyPlugin(),
          ],
        },
      })
      const iconItem = wrapper.find('.v-icon')
      expect(iconItem.exists()).toBe(true)
    })
  })
})
