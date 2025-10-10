//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  setActivePinia,
  createPinia,
} from 'pinia'

import { useAuthzStore } from '@/store/authz'
import { useConfigStore } from '@/store/config'
import { useCloudProfileStore } from '@/store/cloudProfile'

import { firstItemMatchingVersionClassification } from '@/composables/helper'

describe('stores', () => {
  describe('cloudProfile', () => {
    const namespace = 'default'

    let authzStore
    let configStore
    let cloudProfileStore

    let cloudProfileRef

    function setSpec (spec) {
      cloudProfileStore.setCloudProfiles([{
        metadata: {
          name: 'foo',
        },
        spec,
      }])
    }

    beforeAll(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2024-01-01'))
    })

    afterAll(() => {
      vi.useRealTimers()
    })

    beforeEach(async () => {
      setActivePinia(createPinia())
      authzStore = useAuthzStore()
      authzStore.setNamespace(namespace)
      configStore = useConfigStore()
      configStore.setConfiguration({
        defaultNodesCIDR: '10.10.0.0/16',
        vendorHints: [{
          type: 'warning',
          message: 'test',
          matchNames: ['gardenlinux'],
        }],
      })
      cloudProfileStore = useCloudProfileStore()
      cloudProfileStore.setCloudProfiles([])

      cloudProfileRef = {
        name: 'foo',
        kind: 'CloudProfile',
      }
    })

    describe('machineTypes and volumeTypes', () => {
      const machineTypes = [
        {
          name: 'machineType1',
          architecture: 'amd64',
        },
        {
          name: 'machineType2',
        },
        {
          name: 'machineType3',
        },
        {
          name: 'machineType4',
          architecture: 'arm64',
        },
      ]
      const volumeTypes = [
        {
          name: 'volumeType1',
        },
        {
          name: 'volumeType2',
        },
        {
          name: 'volumeType3',
        },
      ]
      const regions = [
        {
          name: 'region1',
          zones: [
            {
              name: 'zone1',
              unavailableMachineTypes: [
                'machineType2',
              ],
              unavailableVolumeTypes: [
                'volumeType2',
              ],
            },
            {
              name: 'zone2',
              unavailableMachineTypes: [
                'machineType2',
                'machineType1',
              ],
              unavailableVolumeTypes: [
                'volumeType2',
              ],
            },
            {
              name: 'zone3',
              unavailableMachineTypes: [
                'machineType2',
              ],
              unavailableVolumeTypes: [
                'volumeType2',
                'volumeType3',
              ],
            },
          ],
        },
        {
          name: 'region2',
          zones: [
            {
              name: 'zone1',
            },
          ],
        },
      ]

      beforeEach(() => {
        setSpec({
          machineTypes,
          volumeTypes,
          regions,
        })
      })

      it('should return machineTypes by region and zones from cloud profile', () => {
        let dashboardMachineTypes = cloudProfileStore.machineTypesByCloudProfileRef(cloudProfileRef)
        expect(dashboardMachineTypes).toHaveLength(4)

        dashboardMachineTypes = cloudProfileStore.machineTypesByCloudProfileRefAndRegionAndArchitecture({ cloudProfileRef, region: 'region1', architecture: 'amd64' })
        expect(dashboardMachineTypes).toHaveLength(2)
        expect(dashboardMachineTypes[0].name).toBe('machineType1')
        expect(dashboardMachineTypes[1].name).toBe('machineType3')

        dashboardMachineTypes = cloudProfileStore.machineTypesByCloudProfileRefAndRegionAndArchitecture({ cloudProfileRef, region: 'region2', architecture: 'arm64' })
        expect(dashboardMachineTypes).toHaveLength(1)
        expect(dashboardMachineTypes[0].name).toBe('machineType4')
      })

      it('should return volumeTypes by region and zones from cloud profile', () => {
        let dashboardVolumeTypes = cloudProfileStore.volumeTypesByCloudProfileRef(cloudProfileRef)
        expect(dashboardVolumeTypes).toHaveLength(3)

        dashboardVolumeTypes = cloudProfileStore.volumeTypesByCloudProfileRefAndRegion({ cloudProfileRef, region: 'region1' })
        expect(dashboardVolumeTypes).toHaveLength(2)

        dashboardVolumeTypes = cloudProfileStore.volumeTypesByCloudProfileRefAndRegion({ cloudProfileRef, region: 'region2' })
        expect(dashboardVolumeTypes).toHaveLength(3)
      })

      it('should return an empty machineType / volumeType array if no cloud profile is provided', () => {
        const items = cloudProfileStore.machineTypesByCloudProfileRef()
        expect(items).toBeInstanceOf(Array)
        expect(items).toHaveLength(0)
      })
    })

    describe('providerConfig.constraints', () => {
      const floatingPools = [
        {
          name: 'global FP',
        },
        {
          name: 'regional FP',
          region: 'region1',
        },
        {
          name: 'regional non constraining FP',
          region: 'region2',
          nonConstraining: true,
        },
        {
          name: 'domain specific FP',
          domain: 'domain1',
        },
        {
          name: 'domain specific non constraining FP',
          domain: 'domain2',
          nonConstraining: true,
        },
        {
          name: 'domain specific, regional FP',
          domain: 'domain3',
          region: 'region3',
        },
        {
          name: 'additional domain specific, regional FP',
          domain: 'domain3',
          region: 'region3',
        },
        {
          name: 'domain specific, regional non constraining FP',
          domain: 'domain4',
          region: 'region4',
          nonConstraining: true,
        },
      ]
      const loadBalancerProviders = [
        {
          name: 'global LB',
        },
        {
          name: 'regional LB',
          region: 'region1',
        },
        {
          name: 'additional regional LB',
          region: 'region1',
        },
        {
          name: 'other regional LB',
          region: 'region2',
        },
      ]

      beforeEach(() => {
        setSpec({
          providerConfig: {
            constraints: {
              floatingPools,
              loadBalancerProviders,
            },
          },
        })
      })

      it('should return floating pool names by region and domain from cloud profile', () => {
        let region = 'fooRegion'
        let secretDomain = 'fooDomain'
        let dashboardFloatingPools = cloudProfileStore.floatingPoolNamesByCloudProfileRefAndRegionAndDomain({ cloudProfileRef, region, secretDomain })
        expect(dashboardFloatingPools).toHaveLength(1)
        expect(dashboardFloatingPools[0]).toBe('global FP')

        region = 'region1'
        secretDomain = 'fooDomain'
        dashboardFloatingPools = cloudProfileStore.floatingPoolNamesByCloudProfileRefAndRegionAndDomain({ cloudProfileRef, region, secretDomain })
        expect(dashboardFloatingPools).toHaveLength(1)
        expect(dashboardFloatingPools[0]).toBe('regional FP')

        region = 'region2'
        secretDomain = 'fooDomain'
        dashboardFloatingPools = cloudProfileStore.floatingPoolNamesByCloudProfileRefAndRegionAndDomain({ cloudProfileRef, region, secretDomain })
        expect(dashboardFloatingPools).toHaveLength(2)
        expect(dashboardFloatingPools[0]).toBe('global FP')
        expect(dashboardFloatingPools[1]).toBe('regional non constraining FP')

        region = 'fooRegion'
        secretDomain = 'domain1'
        dashboardFloatingPools = cloudProfileStore.floatingPoolNamesByCloudProfileRefAndRegionAndDomain({ cloudProfileRef, region, secretDomain })
        expect(dashboardFloatingPools).toHaveLength(1)
        expect(dashboardFloatingPools[0]).toBe('domain specific FP')

        region = 'fooRegion'
        secretDomain = 'domain2'
        dashboardFloatingPools = cloudProfileStore.floatingPoolNamesByCloudProfileRefAndRegionAndDomain({ cloudProfileRef, region, secretDomain })
        expect(dashboardFloatingPools).toHaveLength(2)
        expect(dashboardFloatingPools[0]).toBe('global FP')
        expect(dashboardFloatingPools[1]).toBe('domain specific non constraining FP')

        region = 'region3'
        secretDomain = 'domain3'
        dashboardFloatingPools = cloudProfileStore.floatingPoolNamesByCloudProfileRefAndRegionAndDomain({ cloudProfileRef, region, secretDomain })
        expect(dashboardFloatingPools).toHaveLength(2)
        expect(dashboardFloatingPools[0]).toBe('domain specific, regional FP')
        expect(dashboardFloatingPools[1]).toBe('additional domain specific, regional FP')

        region = 'region4'
        secretDomain = 'domain4'
        dashboardFloatingPools = cloudProfileStore.floatingPoolNamesByCloudProfileRefAndRegionAndDomain({ cloudProfileRef, region, secretDomain })
        expect(dashboardFloatingPools).toHaveLength(2)
        expect(dashboardFloatingPools[0]).toBe('global FP')
        expect(dashboardFloatingPools[1]).toBe('domain specific, regional non constraining FP')
      })

      it('should return load balancer provider names by region from cloud profile', () => {
        let region = 'fooRegion'
        let dashboardLoadBalancerProviderNames = cloudProfileStore.loadBalancerProviderNamesByCloudProfileRefAndRegion({ cloudProfileRef, region })
        expect(dashboardLoadBalancerProviderNames).toHaveLength(1)
        expect(dashboardLoadBalancerProviderNames[0]).toBe('global LB')

        region = 'region1'
        dashboardLoadBalancerProviderNames = cloudProfileStore.loadBalancerProviderNamesByCloudProfileRefAndRegion({ cloudProfileRef, region })
        expect(dashboardLoadBalancerProviderNames).toHaveLength(2)
        expect(dashboardLoadBalancerProviderNames[0]).toBe('regional LB')
        expect(dashboardLoadBalancerProviderNames[1]).toBe('additional regional LB')

        region = 'region2'
        dashboardLoadBalancerProviderNames = cloudProfileStore.loadBalancerProviderNamesByCloudProfileRefAndRegion({ cloudProfileRef, region })
        expect(dashboardLoadBalancerProviderNames).toHaveLength(1)
        expect(dashboardLoadBalancerProviderNames[0]).toBe('other regional LB')
      })
    })

    describe('providerConfig.defaultNodesCIDR', () => {
      it('should return default node cidr from config', async () => {
        const defaultNodesCIDR = cloudProfileStore.getDefaultNodesCIDR(cloudProfileRef)
        expect(defaultNodesCIDR).toBe('10.10.0.0/16')
      })

      it('should return default node cidr from cloud profile', () => {
        setSpec({
          providerConfig: {
            defaultNodesCIDR: '1.2.3.4/16',
          },
        })
        const defaultNodesCIDR = cloudProfileStore.getDefaultNodesCIDR(cloudProfileRef)
        expect(defaultNodesCIDR).toBe('1.2.3.4/16')
      })
    })
    describe('helper', () => {
      describe('#firstItemMatchingVersionClassification', () => {
        it('should select default item that matches version classification', () => {
          const items = [
            {
              version: '1',
              classification: 'deprecated',
            },
            {
              version: '2',
            },
            {
              version: '3',
              classification: 'supported',
            },
          ]

          let item = firstItemMatchingVersionClassification(items)
          expect(item.version).toBe('3')

          items.pop()
          item = firstItemMatchingVersionClassification(items)
          expect(item.version).toBe('2')

          items.pop()
          item = firstItemMatchingVersionClassification(items)
          expect(item.version).toBe('1')
        })
      })
    })
  })
})
