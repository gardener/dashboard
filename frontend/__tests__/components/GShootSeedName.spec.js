//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import { shallowMount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { ref } from 'vue'

import GShootSeedName from '@/components/GShootSeedName.vue'

const { createVuetifyPlugin } = global.fixtures.helper

describe('components', () => {
  describe('g-shoot-seed-name', () => {
    it('should truncate the seed name when requested', () => {
      const wrapper = shallowMount(GShootSeedName, {
        props: {
          truncate: true,
        },
        global: {
          plugins: [
            createPinia(),
            createVuetifyPlugin(),
          ],
          provide: {
            'shoot-item': {
              shootSeedName: ref('example-seed'),
              isShootLastOperationTypeControlPlaneMigrating: ref(false),
              shootLastOperationTypeControlPlaneMigrationMessage: ref(''),
            },
          },
        },
      })

      expect(wrapper.classes()).toContain('seed-name--truncate')
      expect(wrapper.text()).toContain('example-seed')
    })
  })
})
