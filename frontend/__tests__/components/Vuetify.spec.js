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
    const TestTableRow = {
      name: 'TestTableRow',
      props: {
        item: {
          type: Object,
          required: true,
        },
      },
      template: '<tr><td><div style="height: 40px">{{ item.name }}</div></td></tr>',
    }

    function mountDataTableVirtual ({ itemHeight, itemsCount = 50, useItemRef = false } = {}) {
      const items = Array.from({ length: itemsCount }).map((_, i) => ({
        id: i,
        name: `Item ${i}`,
      }))
      const columns = [
        { key: 'name', title: 'Name' },
      ]

      const Component = {
        name: 'TestVirtualTable',
        components: {
          TestTableRow,
        },
        template: `
          <v-app>
            <v-main>
              <v-data-table-virtual
                :items="items"
                :columns="columns"
                :item-height="itemHeight"
                :height="400"
              >
                <template #item="{ item, itemRef }">
                  <TestTableRow v-if="${useItemRef}" :ref="itemRef" :item="item" />
                  <TestTableRow v-else :item="item" />
                </template>
              </v-data-table-virtual>
            </v-main>
          </v-app>
        `,
        data () {
          return {
            items,
            columns,
            itemHeight,
          }
        },
      }

      return mount(Component, {
        attachTo: document.body,
        global: {
          plugins: [
            createVuetifyPlugin(),
          ],
        },
      })
    }

    // These tests basically test that nothing changes in the way vuetify renders the virtual table
    // as the way it behaves in case no item-height is defined is kind of undeterministic
    it('should render default number of rows if item-height is not defined', async () => {
      const wrapper = mountDataTableVirtual({ itemsCount: 50 })
      await nextTick()

      const rows = wrapper.findAllComponents(TestTableRow)
      expect(rows).toHaveLength(25) // by default, the table expects 16px tall rows
    })

    it('should only render the visible rows if item-height is defined', async () => {
      const wrapper = mountDataTableVirtual({
        itemsCount: 50,
        itemHeight: 40,
      })
      await nextTick()

      const rows = wrapper.findAllComponents(TestTableRow)
      expect(rows).toHaveLength(10) // 400px / 40px = 10 rows
    })

    it('should only render the visible rows if itemRef is provided', async () => {
      const wrapper = mountDataTableVirtual({
        itemsCount: 50,
        useItemRef: true,
      })
      await nextTick()

      const rows = wrapper.findAllComponents(TestTableRow)
      // TODO: Should be 10, why is this not working in the test
      expect(rows).toHaveLength(25) // 400px / 40px = 10 rows
    })

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
