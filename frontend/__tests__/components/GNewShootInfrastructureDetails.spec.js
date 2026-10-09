//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  nextTick,
  ref,
} from 'vue'
import { shallowMount } from '@vue/test-utils'

import GNewShootInfrastructureDetails from '@/components/NewShoot/GNewShootInfrastructureDetails.vue'

function refList () {
  return ref([])
}

describe('components', () => {
  describe('g-new-shoot-infrastructure-details', () => {
    let wrapper
    let shootContext

    function createShootContext () {
      return {
        providerType: ref('aws'),
        cloudProfileRef: ref({ name: 'profile', kind: 'CloudProfile' }),
        infrastructureBinding: ref(),
        region: ref('region-1'),
        networkingType: ref('cilium'),
        cloudProfiles: refList(),
        infrastructureBindings: refList(),
        regionsWithSeed: ref(['region-1']),
        regionsWithoutSeed: refList(),
        showAllRegions: ref(true),
        networkingTypes: ref(['calico', 'cilium']),
        workerless: ref(false),
      }
    }

    function mountComponent () {
      shootContext = createShootContext()
      wrapper = shallowMount(GNewShootInfrastructureDetails, {
        global: {
          provide: {
            'shoot-context': shootContext,
          },
          stubs: {
            VContainer: {
              template: '<div><slot /></div>',
            },
            VRow: {
              template: '<div><slot /></div>',
            },
            VCol: {
              template: '<div><slot /></div>',
            },
            VSelect: {
              props: ['label'],
              template: '<div class="v-select" :data-label="label" />',
            },
            GSelectCloudProfile: {
              template: '<div data-test="cloud-profile" />',
            },
            GSelectCredential: {
              template: '<div data-test="credential" />',
            },
          },
        },
      })
    }

    function selectByLabel (label) {
      return wrapper.find(`.v-select[data-label="${label}"]`)
    }

    beforeEach(() => {
      mountComponent()
    })

    afterEach(() => {
      wrapper.unmount()
    })

    it('should always require region and require networking only for shoots with workers', async () => {
      shootContext.region.value = ''
      shootContext.networkingType.value = ''
      await wrapper.vm.v$.$validate()

      expect(wrapper.vm.v$.region.required.$invalid).toBe(true)
      expect(wrapper.vm.v$.networkingType.required.$invalid).toBe(true)
      expect(wrapper.find('[data-test="credential"]').exists()).toBe(true)
      expect(selectByLabel('Networking Type').exists()).toBe(true)

      shootContext.workerless.value = true
      await nextTick()
      await wrapper.vm.v$.$validate()

      expect(wrapper.vm.v$.region.required.$invalid).toBe(true)
      expect(wrapper.vm.v$.networkingType.required.$invalid).toBe(false)
      expect(wrapper.find('[data-test="credential"]').exists()).toBe(false)
      expect(selectByLabel('Networking Type').exists()).toBe(false)
    })

    it('should resolve registered provider UI independently of workerless mode', async () => {
      shootContext.providerType.value = 'openstack'
      await nextTick()
      expect(wrapper.vm.createInfrastructureDetailsComponent).toBeDefined()

      shootContext.workerless.value = true
      await nextTick()
      expect(wrapper.findComponent(wrapper.vm.createInfrastructureDetailsComponent).exists()).toBe(true)

      shootContext.workerless.value = false
      shootContext.providerType.value = 'unregistered'
      await nextTick()
      expect(wrapper.vm.createInfrastructureDetailsComponent).toBeUndefined()
    })
  })
})
