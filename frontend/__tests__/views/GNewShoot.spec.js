//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import { ref } from 'vue'
import { shallowMount } from '@vue/test-utils'
import {
  createPinia,
  setActivePinia,
} from 'pinia'

import { useCloudProfileStore } from '@/store/cloudProfile'
import { useConfigStore } from '@/store/config'

import GNewShoot from '@/views/GNewShoot.vue'

const { createVuetifyPlugin } = global.fixtures.helper

vi.mock('@/composables/useShootContext', () => ({
  useShootContext: () => ({
    shootNamespace: ref(),
    shootName: ref(),
    shootManifest: ref(),
    isShootDirty: ref(false),
    workerless: ref(false),
    maintenanceAutoUpdateKubernetesVersion: ref(false),
    maintenanceAutoUpdateMachineImageVersion: ref(false),
  }),
}))

describe('views', () => {
  describe('g-new-shoot', () => {
    let cloudProfileStore
    let pinia
    let wrapper

    function mountComponent (providerTypes) {
      cloudProfileStore.setCloudProfiles(providerTypes.map(type => ({
        spec: { type },
      })))

      wrapper = shallowMount(GNewShoot, {
        global: {
          plugins: [
            createVuetifyPlugin(),
            pinia,
          ],
          provide: {
            api: {},
            logger: {},
          },
          stubs: {
            VCard: {
              template: '<div data-test="card"><slot /></div>',
            },
            VContainer: {
              template: '<div><slot /></div>',
            },
            GToolbar: {
              props: {
                title: String,
              },
              template: '<div data-test="toolbar" :data-title="title">{{ title }}</div>',
            },
          },
        },
      })
    }

    function infrastructureCard () {
      return wrapper.findAll('[data-test="card"]').find(card => card.find('[data-test="toolbar"][data-title="Infrastructure"]').exists())
    }

    beforeEach(() => {
      pinia = createPinia()
      setActivePinia(pinia)
      useConfigStore().setConfiguration(global.fixtures.config)
      cloudProfileStore = useCloudProfileStore()
    })

    afterEach(() => {
      wrapper?.unmount()
    })

    it('hides the Infrastructure card for one provider and shows it for multiple providers', () => {
      mountComponent(['aws'])
      expect(infrastructureCard()).toBeUndefined()

      wrapper.unmount()
      mountComponent(['aws', 'gcp'])
      expect(wrapper.vm.sortedInfraProviderTypeList).toEqual(['aws', 'gcp'])
      expect(infrastructureCard()).toBeDefined()
    })
  })
})
