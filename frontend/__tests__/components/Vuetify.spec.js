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

  describe('v-data-table-virtual', () => {
    // These tests basically test that nothing changes in the way vuetify renders the virtual table
    // as the way it behaves in case no item-height is defined is kind of undeterministic
    const TestTableRow = {
      name: 'TestTableRow',
      props: {
        item: {
          type: Object,
          required: true,
        },
      },
      template: '<div class="test-table-row">{{ item.name }}</div>',
    }

    function mountDataTableVirtual ({ itemHeight, itemsCount = 50 } = {}) {
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
                <template #item="{ item }">
                  <TestTableRow :item="item" />
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
        global: {
          plugins: [
            createVuetifyPlugin(),
          ],
        },
      })
    }

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
  })
})
