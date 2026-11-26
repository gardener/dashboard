//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  nextTick,
  ref,
  shallowRef,
} from 'vue'
import { shallowMount } from '@vue/test-utils'

import GGdchInfrastructureDetails from '@/providers/infra/gdch/GGdchInfrastructureDetails.vue'
import GMetalInfrastructureDetails from '@/providers/infra/metal/GMetalInfrastructureDetails.vue'
import GOpenstackInfrastructureDetails from '@/providers/infra/openstack/GOpenstackInfrastructureDetails.vue'

const stubs = {
  VCol: {
    template: '<div><slot /></div>',
  },
  VSelect: {
    props: ['label'],
    emits: ['blur'],
    template: '<button class="v-select" :data-label="label" @click="$emit(\'blur\')" />',
  },
  VTextField: {
    props: ['label'],
    emits: ['blur'],
    template: '<button class="v-text-field" :data-label="label" @click="$emit(\'blur\')" />',
  },
  VCheckbox: {
    props: ['label'],
    template: '<div class="v-checkbox" :data-label="label" />',
  },
  GWildcardSelect: {
    template: '<div data-test="floating-pool" />',
  },
}

function mountComponent (component, infrastructureContext, shootContext = {}) {
  return shallowMount(component, {
    global: {
      provide: {
        'shoot-context': {
          providerInfrastructureContext: shallowRef(infrastructureContext),
          workerless: ref(false),
          ...shootContext,
        },
      },
      stubs,
    },
  })
}

describe('provider infrastructure details', () => {
  it('renders and validates the OpenStack fields', async () => {
    const infrastructureContext = {
      loadBalancerProviderName: ref(),
      floatingPoolName: ref(),
      allLoadBalancerProviderNames: ref(['f5']),
      allFloatingPoolNames: ref(['FloatingIP-*']),
    }
    const wrapper = mountComponent(GOpenstackInfrastructureDetails, infrastructureContext)

    await wrapper.vm.v$.$validate()
    expect(wrapper.vm.v$.loadBalancerProviderName.required.$invalid).toBe(true)
    expect(wrapper.vm.v$.loadBalancerProviderName.required.$params.fieldName).toBe('Load Balancer Provider')
    expect(wrapper.find('[data-test="floating-pool"]').exists()).toBe(true)
    expect(wrapper.find('[data-label="Load Balancer Provider"]').exists()).toBe(true)

    infrastructureContext.loadBalancerProviderName.value = 'f5'
    await nextTick()
    await wrapper.vm.v$.$validate()
    expect(wrapper.vm.v$.loadBalancerProviderName.required.$invalid).toBe(false)

    wrapper.vm.workerless = true
    await nextTick()
    await wrapper.vm.v$.$validate()
    expect(wrapper.vm.v$.loadBalancerProviderName.required.$invalid).toBe(false)
    expect(wrapper.find('[data-test="floating-pool"]').exists()).toBe(false)
    expect(wrapper.find('[data-label="Load Balancer Provider"]').exists()).toBe(false)

    wrapper.unmount()
  })

  it('renders, validates, and eagerly touches the Metal fields', async () => {
    const workerless = ref(true)
    const infrastructureContext = {
      projectID: ref(),
      partitionID: ref(),
      firewallImage: ref(),
      firewallSize: ref(),
      firewallNetworks: ref(),
      partitionIDs: ref([]),
      firewallImages: ref([]),
      firewallSizes: ref([]),
      allFirewallNetworks: ref([]),
    }
    const wrapper = mountComponent(GMetalInfrastructureDetails, infrastructureContext, {
      workerless,
    })

    expect(wrapper.vm.v$.projectID.$dirty).toBe(false)
    await wrapper.vm.v$.$validate()
    for (const field of ['projectID', 'partitionID', 'firewallImage', 'firewallSize', 'firewallNetworks']) {
      expect(wrapper.vm.v$[field].required.$invalid).toBe(false)
    }
    wrapper.vm.v$.$reset()
    expect(wrapper.vm.v$.projectID.$dirty).toBe(false)
    expect(wrapper.find('[data-label="Project ID"]').exists()).toBe(false)

    workerless.value = false
    await nextTick()
    expect(wrapper.vm.v$.projectID.$dirty).toBe(true)
    await wrapper.vm.v$.$validate()
    for (const field of ['projectID', 'partitionID', 'firewallImage', 'firewallSize', 'firewallNetworks']) {
      expect(wrapper.vm.v$[field].required.$invalid).toBe(true)
    }
    expect(wrapper.find('[data-label="Project ID"]').exists()).toBe(true)
    expect(wrapper.find('[data-label="Partition ID"]').exists()).toBe(true)
    expect(wrapper.find('[data-label="Firewall Image"]').exists()).toBe(true)
    expect(wrapper.find('[data-label="Firewall Size"]').exists()).toBe(true)
    expect(wrapper.find('[data-label="Firewall Networks"]').exists()).toBe(true)

    infrastructureContext.projectID.value = 'project-1'
    infrastructureContext.partitionID.value = 'partition-1'
    infrastructureContext.firewallImage.value = 'image-1'
    infrastructureContext.firewallSize.value = 'size-1'
    infrastructureContext.firewallNetworks.value = ['internet']
    await nextTick()
    await wrapper.vm.v$.$validate()

    for (const field of ['projectID', 'partitionID', 'firewallImage', 'firewallSize', 'firewallNetworks']) {
      expect(wrapper.vm.v$[field].required.$invalid).toBe(false)
    }

    wrapper.unmount()
  })

  it('renders and validates the GDCH fields and node CIDR constraints', async () => {
    const networkingNodes = ref('10.0.0.0/18')
    const infrastructureContext = {
      parentReferenceName: ref(),
      parentReferenceNamespace: ref(),
      parentReferenceType: ref(),
      enableEgress: ref(true),
      nodeCIDR: ref('10.0.0.1/18'),
      parentReferenceTypes: ['SingleSubnet', 'SubnetGroup'],
    }
    const wrapper = mountComponent(GGdchInfrastructureDetails, infrastructureContext, {
      networkingNodes,
    })

    expect(wrapper.find('[data-label="Parent Reference Type"]').exists()).toBe(true)
    expect(wrapper.find('[data-label="Parent Reference Name"]').exists()).toBe(true)
    expect(wrapper.find('[data-label="Parent Reference Namespace (optional)"]').exists()).toBe(true)
    expect(wrapper.find('[data-label="Node CIDR"]').exists()).toBe(true)
    expect(wrapper.find('[data-label="Enable Cloud NAT egress"]').exists()).toBe(true)

    await wrapper.vm.v$.$validate()
    expect(wrapper.vm.v$.parentReferenceName.required.$invalid).toBe(true)
    expect(wrapper.vm.v$.parentReferenceType.required.$invalid).toBe(true)
    expect(wrapper.vm.v$.nodeCIDR.cidr.$invalid).toBe(true)
    expect(wrapper.vm.v$.nodeCIDR.matchesNetworkingNodes.$invalid).toBe(true)

    infrastructureContext.parentReferenceName.value = 'parent-subnet'
    infrastructureContext.parentReferenceType.value = 'SingleSubnet'
    infrastructureContext.nodeCIDR.value = '10.0.0.0/18'
    await nextTick()
    await wrapper.vm.v$.$validate()
    expect(wrapper.vm.v$.nodeCIDR.cidr.$invalid).toBe(false)
    expect(wrapper.vm.v$.nodeCIDR.matchesNetworkingNodes.$invalid).toBe(false)
    expect(wrapper.vm.v$.parentReferenceName.required.$invalid).toBe(false)
    expect(wrapper.vm.v$.parentReferenceType.required.$invalid).toBe(false)

    wrapper.vm.workerless = true
    await nextTick()
    await wrapper.vm.v$.$validate()
    expect(wrapper.vm.v$.nodeCIDR.required.$invalid).toBe(false)
    expect(wrapper.vm.v$.nodeCIDR.cidr.$invalid).toBe(false)
    expect(wrapper.vm.v$.nodeCIDR.matchesNetworkingNodes.$invalid).toBe(false)
    expect(wrapper.find('[data-label="Parent Reference Type"]').exists()).toBe(false)
    expect(wrapper.find('[data-label="Enable Cloud NAT egress"]').exists()).toBe(false)

    wrapper.unmount()
  })
})
