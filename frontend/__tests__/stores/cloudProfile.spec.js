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
    describe('#expiringWorkerGroupsForShoot', () => {
      const machineImages = [
        {
          name: 'gardenlinux',
          versions: [
            {
              version: '1.1.0',
              expirationDate: '2024-04-05T01:02:03Z', // not expired
              classification: 'supported',
            },
            {
              version: '1.0.0',
              expirationDate: '2024-01-05T01:02:03Z', // not expired but expiration warning
              classification: 'supported',
            },
          ],
        },
        {
          name: 'foo',
          versions: [
            {
              version: '1.1.0',
              expirationDate: '2024-04-05T01:02:03Z', // not expired
              classification: 'supported',
            },
            {
              version: '1.0.0',
              expirationDate: '2024-01-05T01:02:03Z', // not expired but expiration warning
              classification: 'supported',
            },
          ],
        },
      ]

      beforeEach(() => {
        setSpec({
          machineImages,
        })
      })

      it('one should be warning level (update available, auto update enabled, expiration warning))', () => {
        const shootWorkerGroups = [
          {
            name: 'worker-foo',
            machine: {
              image: {
                name: 'gardenlinux',
                version: '1.0.0', // expiring
              },
            },
          },
        ]
        const imageAutoPatch = true
        const expiringWorkerGroups = cloudProfileStore.expiringWorkerGroupsForShoot(shootWorkerGroups, cloudProfileRef, imageAutoPatch)
        expect(expiringWorkerGroups).toHaveLength(1)
        expect(expiringWorkerGroups[0].severity).toBe('warning')
      })

      it('one should be warning level (update available, auto update disabled))', () => {
        const shootWorkerGroups = [
          {
            name: 'worker-foo',
            machine: {
              image: {
                name: 'gardenlinux',
                version: '1.0.0', // expiring
              },
            },
          },
        ]
        const imageAutoPatch = false
        const expiringWorkerGroups = cloudProfileStore.expiringWorkerGroupsForShoot(shootWorkerGroups, cloudProfileRef, imageAutoPatch)
        expect(expiringWorkerGroups).toHaveLength(1)
        expect(expiringWorkerGroups[0].severity).toBe('warning')
      })

      it('one should be warning level (update available, auto update enabled, expiration warning), one error (no update path)', () => {
        const shootWorkerGroups = [
          {
            name: 'worker-foo',
            machine: {
              image: {
                name: 'foo',
                version: '1.0.0', // expiring
              },
            },
          },
          {
            name: 'worker-bar',
            machine: {
              image: {
                name: 'bar',
                version: '1.0.0', // does not exist in cloud profile
              },
            },
          },
        ]
        const imageAutoPatch = true
        const expiringWorkerGroups = cloudProfileStore.expiringWorkerGroupsForShoot(shootWorkerGroups, cloudProfileRef, imageAutoPatch)
        expect(expiringWorkerGroups).toHaveLength(2)
        const fooWorkerGroup = expiringWorkerGroups.find(wg => wg.workerName === 'worker-foo')
        const barWorkerGroup = expiringWorkerGroups.find(wg => wg.workerName === 'worker-bar')
        expect(fooWorkerGroup.severity).toBe('warning')
        expect(barWorkerGroup.severity).toBe('warning')
      })

      it('should be empty array (ignore versions without expiration warning))', () => {
        const shootWorkerGroups = [
          {
            name: 'worker-foo',
            machine: {
              image: {
                name: 'gardenlinux',
                version: '1.1.0', // not expiring
              },
            },
          },
        ]
        const imageAutoPatch = true
        const expiringWorkerGroups = cloudProfileStore.expiringWorkerGroupsForShoot(shootWorkerGroups, cloudProfileRef, imageAutoPatch)
        expect(expiringWorkerGroups).toHaveLength(0)
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
