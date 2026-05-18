//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { ref } from 'vue'
import {
  createPinia,
  setActivePinia,
} from 'pinia'
import { shallowMount } from '@vue/test-utils'

import { useSeedStatStore } from '@/store/seedStat'

import GSeedInfrastructureCard from '@/components/SeedDetails/GSeedInfrastructureCard.vue'

describe('components', () => {
  describe('g-seed-infrastructure-card', () => {
    function createSeedItem () {
      return {
        seedProviderType: ref('aws'),
        seedProviderRegion: ref('eu-west-1'),
        seedProviderZones: ref(['eu-west-1a']),
        seedNetworksNodes: ref('10.250.0.0/16'),
        seedNetworksPods: ref('100.96.0.0/11'),
        seedNetworksServices: ref('100.64.0.0/13'),
        seedNetworksShootDefaultsPods: ref('10.0.0.0/16'),
        seedNetworksShootDefaultsServices: ref('10.1.0.0/16'),
        seedNetworksBlockCIDRs: ref([]),
        seedAllocatableShoots: ref(20),
        seedShootCount: ref(7),
        seedTotalUnhealthyShoots: ref(4),
        seedUnhealthyShoots: ref(2),
        seedName: ref('infra1-seed'),
      }
    }

    function mountComponent () {
      setActivePinia(createPinia())

      const seedStatStore = useSeedStatStore()

      const subscribeSpy = vi.spyOn(seedStatStore, 'subscribe').mockResolvedValue()
      const unsubscribeSpy = vi.spyOn(seedStatStore, 'unsubscribe').mockResolvedValue()

      const wrapper = shallowMount(GSeedInfrastructureCard, {
        global: {
          provide: {
            'seed-item': createSeedItem(),
          },
          stubs: {
            VCard: {
              template: '<div class="v-card-stub"><slot /></div>',
            },
            VDivider: {
              template: '<div class="v-divider-stub" />',
            },
            VIcon: {
              template: '<i class="v-icon-stub"><slot /></i>',
            },
            GToolbar: {
              props: ['title'],
              template: '<div class="g-toolbar-stub">{{ title }}</div>',
            },
            GList: {
              template: '<div class="g-list-stub"><slot /></div>',
            },
            GListItem: {
              template: '<div class="g-list-item-stub"><slot name="prepend" /><slot /></div>',
            },
            GListItemContent: {
              props: ['label'],
              template: `
                <div class="g-list-item-content-stub">
                  <div class="g-list-item-content-label">{{ label }}</div>
                  <div class="g-list-item-content-value"><slot /></div>
                </div>
              `,
            },
            GVendor: {
              template: '<div class="g-vendor-stub" />',
            },
            GShootHealthDonut: {
              props: ['shootCount', 'totalUnhealthyShoots', 'matchingUnhealthyShoots'],
              template: '<div class="shoot-health-donut-stub" :data-shoot-count="shootCount" :data-unhealthy-total="totalUnhealthyShoots" :data-unhealthy-matching="matchingUnhealthyShoots" />',
            },
            GSeedCapacityIndicator: {
              props: ['allocatableShoots', 'shootCount'],
              template: '<div class="seed-capacity-indicator-stub" :data-allocatable-shoots="allocatableShoots" :data-shoot-count="shootCount" />',
            },
          },
        },
      })

      return {
        wrapper,
        seedStatStore,
        subscribeSpy,
        unsubscribeSpy,
      }
    }

    it('should render the shoot health donut and capacity in the infrastructure card', () => {
      const {
        wrapper,
        seedStatStore,
        subscribeSpy,
        unsubscribeSpy,
      } = mountComponent()

      const healthDonut = wrapper.find('.shoot-health-donut-stub')
      const capacityIndicator = wrapper.find('.seed-capacity-indicator-stub')

      expect(wrapper.text()).toContain('Capacity')
      expect(wrapper.text()).toContain('Shoot Health')
      expect(capacityIndicator.exists()).toBe(true)
      expect(capacityIndicator.attributes('data-allocatable-shoots')).toBe('20')
      expect(capacityIndicator.attributes('data-shoot-count')).toBe('7')
      expect(healthDonut.exists()).toBe(true)
      expect(healthDonut.attributes('data-shoot-count')).toBe('7')
      expect(healthDonut.attributes('data-unhealthy-total')).toBe('4')
      expect(healthDonut.attributes('data-unhealthy-matching')).toBe('2')
      expect(wrapper.text()).not.toContain('total unhealthy')
      expect(subscribeSpy).toHaveBeenCalledWith({
        name: 'infra1-seed',
        unhealthyFilterMask: seedStatStore.currentUnhealthyFilterMask,
      })

      wrapper.unmount()

      expect(unsubscribeSpy).toHaveBeenCalled()
    })
  })
})
