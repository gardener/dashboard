//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import EventEmitter from 'events'

import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'

import { useAuthzStore } from '@/store/authz'
import { useConfigStore } from '@/store/config'
import { useProjectStore } from '@/store/project'

import GNewShootDetails from '@/components/NewShoot/GNewShootDetails.vue'

const { createPlugins } = global.fixtures.helper

describe('components', () => {
  describe('g-new-shoot-details', () => {
    let pinia

    function mountNewShootDetails (props) {
      return mount(GNewShootDetails, {
        global: {
          plugins: [
            ...createPlugins(),
            pinia,
          ],
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
      const userInterActionBus = new EventEmitter()
      const wrapper = mountNewShootDetails({ userInterActionBus })
      expect(wrapper.find('.v-row:nth-of-type(4) label').text()).toBe('title')
      expect(wrapper.vm.maxShootNameLength).toBe(18)
    })
  })
})
