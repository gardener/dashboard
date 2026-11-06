//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  computed,
  nextTick,
  ref,
} from 'vue'
import {
  createPinia,
  setActivePinia,
} from 'pinia'
import { shallowMount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'

import { useCloudProfileStore } from '@/store/cloudProfile'

import GOpenstackShootInfrastructure from '@/providers/infra/openstack/GOpenstackShootInfrastructure.vue'

describe('GOpenstackShootInfrastructure', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('derives load balancer classes from the matching floating pool and honors Shoot overrides', async () => {
    const cloudProfileStore = useCloudProfileStore()
    cloudProfileStore.setCloudProfiles([{
      metadata: {
        name: 'openstack-profile',
      },
      spec: {
        type: 'openstack',
        providerConfig: {
          constraints: {
            floatingPools: [{
              name: 'FloatingIP-*',
              region: 'region-1',
              loadBalancerClasses: [
                { name: 'class-a' },
                { name: 'class-b', purpose: 'default' },
              ],
            }],
          },
        },
      },
    }])

    const shootItem = ref({
      spec: {
        cloudProfile: {
          name: 'openstack-profile',
          kind: 'CloudProfile',
        },
        region: 'region-1',
        provider: {
          infrastructureConfig: {
            floatingPoolName: 'FloatingIP-external',
          },
          controlPlaneConfig: {},
        },
      },
    })
    const shootItemContext = {
      shootItem,
      shootCloudProfileRef: computed(() => shootItem.value.spec.cloudProfile),
      shootRegion: computed(() => shootItem.value.spec.region),
      shootCloudProviderBinding: ref(),
    }
    const wrapper = shallowMount(GOpenstackShootInfrastructure, {
      global: {
        plugins: [createVuetify()],
        provide: {
          'shoot-item': shootItemContext,
        },
        stubs: {
          VDivider: true,
          GListItem: {
            template: '<div><slot name="prepend" /><slot /></div>',
          },
          GListItemContent: {
            template: '<div><slot /></div>',
          },
          VIcon: {
            template: '<i><slot /></i>',
          },
          VChip: {
            template: '<span><slot /></span>',
          },
        },
      },
    })

    expect(wrapper.vm.shootLoadbalancerClasses).toEqual([
      { name: 'class-a' },
      { name: 'class-b', purpose: 'default' },
    ])
    expect(wrapper.vm.defaultLoadbalancerClass).toBe('class-b')
    expect(wrapper.text()).toContain('class-a')
    expect(wrapper.text()).toContain('class-b')

    shootItem.value.spec.provider.controlPlaneConfig.loadBalancerClasses = [
      { name: 'shoot-default' },
      { name: 'shoot-other' },
    ]
    await nextTick()

    expect(wrapper.vm.shootLoadbalancerClasses).toEqual([
      { name: 'shoot-default' },
      { name: 'shoot-other' },
    ])
    expect(wrapper.vm.defaultLoadbalancerClass).toBe('shoot-default')

    wrapper.unmount()
  })
})
