//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'

import { useAuthzStore } from '@/store/authz'
import { useConfigStore } from '@/store/config'
import { useProjectStore } from '@/store/project'

import GNewShootDetails from '@/components/NewShoot/GNewShootDetails.vue'

import { createShootContextComposable } from '@/composables/useShootContext'

import {
  components as componentsPlugin,
  utils as utilsPlugin,
  notify as notifyPlugin,
} from '@/plugins'

const { createVuetifyPlugin } = global.fixtures.helper

describe('components', () => {
  describe('g-new-shoot-details', () => {
    let pinia

    function mountNewShootDetails (props) {
      return mount(GNewShootDetails, {
        global: {
          plugins: [
            createVuetifyPlugin(),
            componentsPlugin,
            utilsPlugin,
            notifyPlugin,
            pinia,
          ],
          provide: {
            'shoot-context': createShootContextComposable(),
          },
        },
        props,
      })
    }

    beforeEach(() => {
      pinia = createTestingPinia({
        stubActions: false,
      })
      const authzStore = useAuthzStore(pinia)
      authzStore.namespace = 'garden-foo'
      const configStore = useConfigStore(pinia)
      configStore.sla = {
        title: 'title',
        description: 'description',
      }
      const projectStore = useProjectStore(pinia)
      projectStore.projectList = [
        {
          metadata: {
            name: 'foo',
            namespace: 'garden-foo',
          },
          data: {
            owner: 'owner',
          },
        },
      ]
    })

    it('maximum shoot name length should depend on project name', () => {
      const wrapper = mountNewShootDetails({ })
      expect(wrapper.find('.v-row:nth-of-type(3) label').text()).toBe('title')
      expect(wrapper.vm.maxShootNameLength).toBe(18)
    })
  })
})
