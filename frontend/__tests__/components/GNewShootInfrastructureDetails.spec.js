//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
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
        providerControlPlaneConfigLoadBalancerProviderName: ref(),
        providerControlPlaneConfigLoadBalancerClassNames: refList(),
        providerInfrastructureConfigFloatingPoolName: ref(),
        providerInfrastructureConfigPartitionID: ref(),
        providerInfrastructureConfigProjectID: ref(),
        providerInfrastructureConfigFirewallImage: ref(),
        providerInfrastructureConfigFirewallSize: ref(),
        providerInfrastructureConfigFirewallNetworks: refList(),
        cloudProfiles: refList(),
        infrastructureBindings: refList(),
        regionsWithSeed: ref(['region-1']),
        regionsWithoutSeed: refList(),
        showAllRegions: ref(true),
        networkingTypes: ref(['calico', 'cilium']),
        allLoadBalancerProviderNames: ref(['f5']),
        allLoadBalancerClassNames: refList(),
        partitionIDs: refList(),
        firewallImages: refList(),
        firewallSizes: refList(),
        allFirewallNetworks: refList(),
        allFloatingPoolNames: refList(),
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
            VTextField: {
              props: ['label'],
              emits: ['blur'],
              template: '<button class="v-text-field" :data-label="label" @click="$emit(\'blur\')" />',
            },
            GSelectCloudProfile: {
              template: '<div data-test="cloud-profile" />',
            },
            GSelectCredential: {
              template: '<div data-test="credential" />',
            },
            GWildcardSelect: {
              template: '<div data-test="floating-pool" />',
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

    it('should require and show only OpenStack-specific infrastructure fields', async () => {
      shootContext.providerType.value = 'openstack'
      await nextTick()
      await wrapper.vm.v$.$validate()

      expect(wrapper.vm.v$.loadBalancerProviderName.required.$invalid).toBe(true)
      expect(wrapper.vm.v$.projectID.required.$invalid).toBe(false)
      expect(wrapper.find('[data-test="floating-pool"]').exists()).toBe(true)
      expect(selectByLabel('Load Balancer Provider').exists()).toBe(true)

      shootContext.providerControlPlaneConfigLoadBalancerProviderName.value = 'f5'
      await nextTick()
      await wrapper.vm.v$.$validate()
      expect(wrapper.vm.v$.loadBalancerProviderName.required.$invalid).toBe(false)

      shootContext.workerless.value = true
      await nextTick()
      await wrapper.vm.v$.$validate()
      expect(wrapper.vm.v$.loadBalancerProviderName.required.$invalid).toBe(false)
      expect(wrapper.find('[data-test="floating-pool"]').exists()).toBe(false)
      expect(selectByLabel('Load Balancer Provider').exists()).toBe(false)
    })

    it('should require every Metal-specific infrastructure field', async () => {
      shootContext.providerType.value = 'metal'
      await nextTick()
      await wrapper.vm.v$.$validate()

      for (const field of ['projectID', 'partitionID', 'firewallImage', 'firewallSize', 'firewallNetworks']) {
        expect(wrapper.vm.v$[field].required.$invalid).toBe(true)
      }

      expect(wrapper.find('.v-text-field[data-label="Project ID"]').exists()).toBe(true)
      expect(selectByLabel('Partition ID').exists()).toBe(true)
      expect(selectByLabel('Firewall Image').exists()).toBe(true)
      expect(selectByLabel('Firewall Size').exists()).toBe(true)
      expect(selectByLabel('Firewall Networks').exists()).toBe(true)

      shootContext.providerInfrastructureConfigProjectID.value = 'project-1'
      shootContext.providerInfrastructureConfigPartitionID.value = 'partition-1'
      shootContext.providerInfrastructureConfigFirewallImage.value = 'image-1'
      shootContext.providerInfrastructureConfigFirewallSize.value = 'size-1'
      shootContext.providerInfrastructureConfigFirewallNetworks.value = ['internet']
      await nextTick()
      await wrapper.vm.v$.$validate()

      for (const field of ['projectID', 'partitionID', 'firewallImage', 'firewallSize', 'firewallNetworks']) {
        expect(wrapper.vm.v$[field].required.$invalid).toBe(false)
      }
    })

    it('should touch the Firewall Size validation when its field is blurred', async () => {
      shootContext.providerType.value = 'metal'
      await nextTick()

      expect(wrapper.vm.v$.firewallSize.$dirty).toBe(false)
      await wrapper.find('.v-select[data-label="Firewall Size"]').trigger('blur')
      expect(wrapper.vm.v$.firewallSize.$dirty).toBe(true)
    })

    it('should require the default vSphere load balancer class when available', async () => {
      shootContext.allLoadBalancerClassNames.value = ['default', 'other']
      shootContext.providerType.value = 'vsphere'
      await nextTick()
      await wrapper.vm.v$.$validate()

      expect(wrapper.vm.v$.loadBalancerClassNames.required.$invalid).toBe(true)
      expect(wrapper.vm.v$.loadBalancerClassNames.includesKey.$invalid).toBe(true)
      expect(selectByLabel('Load Balancer Classes').exists()).toBe(true)

      shootContext.providerControlPlaneConfigLoadBalancerClassNames.value = ['other']
      await nextTick()
      await wrapper.vm.v$.$validate()
      expect(wrapper.vm.v$.loadBalancerClassNames.required.$invalid).toBe(false)
      expect(wrapper.vm.v$.loadBalancerClassNames.includesKey.$invalid).toBe(true)

      shootContext.providerControlPlaneConfigLoadBalancerClassNames.value = ['default']
      await nextTick()
      await wrapper.vm.v$.$validate()
      expect(wrapper.vm.v$.loadBalancerClassNames.includesKey.$invalid).toBe(false)

      shootContext.workerless.value = true
      await nextTick()
      expect(selectByLabel('Load Balancer Classes').exists()).toBe(false)
    })
  })
})
