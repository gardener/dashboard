//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import { shallowMount } from '@vue/test-utils'
import {
  createMemoryHistory,
  createRouter,
} from 'vue-router'
import { createPinia } from 'pinia'

import GHome from '@/views/GHome.vue'

const { createVuetifyPlugin } = global.fixtures.helper

async function mountHome (routeName) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { name: 'Home', path: '/', component: {} },
      { name: 'NewProject', path: '/projects/+', component: {} },
    ],
  })
  await router.push({ name: routeName })
  const wrapper = shallowMount(GHome, {
    global: {
      plugins: [
        createVuetifyPlugin(),
        createPinia(),
        router,
      ],
    },
  })
  return { router, wrapper }
}

describe('views', () => {
  describe('GHome', () => {
    it.each([
      ['Home', false],
      ['NewProject', true],
    ])('opens the Project dialog on %s: %s', async (routeName, open) => {
      const { wrapper } = await mountHome(routeName)

      expect(wrapper.vm.projectDialog).toBe(open)
    })

    it('opens the Project dialog when navigating from Home to NewProject', async () => {
      const { router, wrapper } = await mountHome('Home')

      await router.push({ name: 'NewProject' })

      expect(wrapper.vm.projectDialog).toBe(true)
    })
  })
})
