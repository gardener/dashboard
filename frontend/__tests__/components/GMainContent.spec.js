//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  defineComponent,
  nextTick,
} from 'vue'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'

import GMainContent from '@/components/GMainContent.vue'

const { createVuetifyPlugin } = global.fixtures.helper

const TestComponent = defineComponent({
  components: {
    GMainContent,
  },
  template: `
    <v-app>
      <v-app-bar :height="64" />
      <g-main-content />
    </v-app>
  `,
})

describe('components', () => {
  describe('g-main-content', () => {
    it('includes the alert banner in the viewport-bounded content area', async () => {
      const wrapper = mount(TestComponent, {
        global: {
          plugins: [
            createVuetifyPlugin(),
            createPinia(),
          ],
          stubs: {
            GAlertBanner: {
              template: '<div class="alert-banner-stub" />',
            },
            RouterView: true,
          },
        },
      })

      await nextTick()

      const content = wrapper.get('.g-main__content')
      const alertBanner = content.get('.alert-banner-stub')
      expect(content.element.style.height).toBe('calc(100vh - 64px)')
      expect(alertBanner.classes()).toContain('g-main__alert')
      expect(content.get('.g-main__wrap').exists()).toBe(true)
    })
  })
})
