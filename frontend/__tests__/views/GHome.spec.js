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

    it('updates the Project dialog when navigating between Home and NewProject', async () => {
      const { router, wrapper } = await mountHome('Home')

      await router.push({ name: 'NewProject' })

      expect(wrapper.vm.projectDialog).toBe(true)

      await router.push({ name: 'Home' })

      expect(wrapper.vm.projectDialog).toBe(false)
    })
  })
})
