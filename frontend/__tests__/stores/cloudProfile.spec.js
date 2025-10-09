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
import { firstItemMatchingVersionClassification } from '@/store/cloudProfile/helper'

import find from 'lodash/find'

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

    function setMachineImages (machineImages) {
      setSpec({
        machineImages,
      })
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

    describe('machineImages', () => {
      let decoratedAndSortedMachineImages

      const machineImages = [
        {
          name: 'gardenlinux',
          versions: [
            {
              version: '1.2.0',
              classification: 'preview',
            },
            {
              version: '1.1.5',
              classification: 'supported',
            },
            {
              version: '1.1.4',
              expirationDate: '2024-04-05T01:02:03Z', // not expired
              classification: 'supported',
            },
            {
              version: '1.1.3',
              expirationDate: '2024-01-05T01:02:03Z', // not expired but expiration warning
              classification: 'supported',
            },
            {
              version: '1.1.2',
              expirationDate: '2023-04-05T01:02:03Z', // expired
            },
          ],
        },
        {
          name: 'foo',
          versions: [
            {
              version: '1.02', // incompatible version (not semver compatible - can be normalized)
            },
            {
              version: '1.2.x', // invalid version (not harmonizable)
            },
            {
              version: '1.3.3',
              expirationDate: '2024-01-05T01:02:03Z', // not expired but expiration warning
            },
            {
              version: '1.3.4',
              classification: 'deprecated',
            },
          ],
        },
      ]

      beforeEach(() => {
        setMachineImages(machineImages)
        decoratedAndSortedMachineImages = cloudProfileStore.machineImagesByCloudProfileRef(cloudProfileRef)
      })

      it('should transform machine images from cloud profile', () => {
        expect(decoratedAndSortedMachineImages).toHaveLength(8)

        const expiredImage = find(decoratedAndSortedMachineImages, { name: 'gardenlinux', version: '1.1.2' })
        expect(expiredImage.isExpired).toBe(true)
        expect(expiredImage.isSupported).toBe(false)

        const imageWithExpirationDate = find(decoratedAndSortedMachineImages, { name: 'gardenlinux', version: '1.1.4' })
        expect(imageWithExpirationDate.expirationDate).toBe('2024-04-05T01:02:03Z')
        expect(imageWithExpirationDate.expirationDateString).toBeDefined()
        expect(imageWithExpirationDate.vendorName).toBe('gardenlinux')
        expect(imageWithExpirationDate.icon).toBe('gardenlinux')
        expect(imageWithExpirationDate.vendorHint).toBeDefined()
        expect(imageWithExpirationDate.vendorHint).toEqual(configStore.vendorHints[0])
        expect(imageWithExpirationDate.classification).toBe('supported')
        expect(imageWithExpirationDate.isSupported).toBe(true)
        expect(imageWithExpirationDate.isDeprecated).toBe(false)
        expect(imageWithExpirationDate.isPreview).toBe(false)
        expect(imageWithExpirationDate.isExpirationWarning).toBe(false)
        expect(imageWithExpirationDate).toBe(decoratedAndSortedMachineImages[2]) // check sorting

        const imageWithNoExpirationDate = find(decoratedAndSortedMachineImages, { name: 'gardenlinux', version: '1.1.5' })
        expect(imageWithNoExpirationDate.isExpirationWarning).toBe(false)
        expect(imageWithNoExpirationDate.isExpired).toBe(false)

        const previewImage = find(decoratedAndSortedMachineImages, { name: 'gardenlinux', version: '1.2.0' })
        expect(previewImage.isSupported).toBe(false)
        expect(previewImage.isPreview).toBe(true)

        const normalizedImage = find(decoratedAndSortedMachineImages, { name: 'foo', version: '1.2.0' })
        expect(normalizedImage).toBeDefined()

        const invalidImage = find(decoratedAndSortedMachineImages, { name: 'foo', version: '1.2.x' })
        expect(invalidImage).toBeUndefined()

        const imageWithExpirationWarning = find(decoratedAndSortedMachineImages, { name: 'foo', version: '1.3.3' })
        expect(imageWithExpirationWarning.vendorHint).toBeUndefined()
        expect(imageWithExpirationWarning.isSupported).toBe(true)
        expect(imageWithExpirationWarning.isExpirationWarning).toBe(true)

        const deprecatedImageWithNoExpiration = find(decoratedAndSortedMachineImages, { name: 'foo', version: '1.3.4' })
        expect(deprecatedImageWithNoExpiration.isDeprecated).toBe(true)
        expect(deprecatedImageWithNoExpiration.isExpirationWarning).toBe(false)
      })

      function generateWorkerGroups (machineImages) {
        return machineImages.map(machineImage => {
          return {
            name: `worker-${Math.random()}`,
            machine: {
              type: 'type',
              image: {
                name: machineImage.name,
                version: machineImage.version,
              },
            },
          }
        })
      }

      describe('#expiringWorkerGroupsForShoot', () => {
        it('one should be warning level (update available, auto update enabled, expiration warning))', () => {
          const imageWithExpirationWarning = find(decoratedAndSortedMachineImages, { name: 'gardenlinux', version: '1.1.3' })
          const imageWithExpirationDate = find(decoratedAndSortedMachineImages, { name: 'gardenlinux', version: '1.1.4' })
          const imageWithNoUpdate = find(decoratedAndSortedMachineImages, { name: 'gardenlinux', version: '1.1.5' })

          const workers = generateWorkerGroups([
            imageWithExpirationDate,
            imageWithNoUpdate,
            imageWithExpirationWarning,
          ])
          let expiredWorkerGroups = cloudProfileStore.expiringWorkerGroupsForShoot(workers, cloudProfileRef, false)
          expect(expiredWorkerGroups).toBeInstanceOf(Array)
          expect(expiredWorkerGroups).toHaveLength(1)
          expect(expiredWorkerGroups[0]).toMatchObject({
            ...imageWithExpirationWarning,
            workerName: workers[2].name,
            isValidTerminationDate: true,
            severity: 'warning',
          })

          expiredWorkerGroups = cloudProfileStore.expiringWorkerGroupsForShoot(workers, cloudProfileRef, true)
          expect(expiredWorkerGroups).toBeInstanceOf(Array)
          expect(expiredWorkerGroups).toHaveLength(2) // Now also include auto update information
          expect(expiredWorkerGroups[0]).toMatchObject({
            ...imageWithExpirationDate,
            workerName: workers[0].name,
            isValidTerminationDate: true,
            severity: 'info',
          })
          expect(expiredWorkerGroups[1]).toMatchObject({
            ...imageWithExpirationWarning,
            workerName: workers[2].name,
            isValidTerminationDate: true,
            severity: 'warning',
          })
        })

        it('one should be warning level (update available, auto update disabled))', () => {
          const imageWithExpirationWarning = find(decoratedAndSortedMachineImages, { name: 'gardenlinux', version: '1.1.3' })
          const imageWithExpirationDate = find(decoratedAndSortedMachineImages, { name: 'gardenlinux', version: '1.1.4' })
          const imageWithNoUpdate = find(decoratedAndSortedMachineImages, { name: 'gardenlinux', version: '1.1.5' })

          const workers = generateWorkerGroups([
            imageWithExpirationDate,
            imageWithNoUpdate,
            imageWithExpirationWarning,
          ])
          const expiredWorkerGroups = cloudProfileStore.expiringWorkerGroupsForShoot(workers, cloudProfileRef, false)
          expect(expiredWorkerGroups).toBeInstanceOf(Array)
          expect(expiredWorkerGroups).toHaveLength(1)
          expect(expiredWorkerGroups[0]).toMatchObject({
            ...imageWithExpirationWarning,
            workerName: workers[2].name,
            isValidTerminationDate: true,
            severity: 'warning',
          })
        })

        it('one should be warning level (update available, auto update enabled, expiration warning), one error (no update path)', () => {
          const imageWithExpirationWarning = find(decoratedAndSortedMachineImages, { name: 'gardenlinux', version: '1.1.3' })
          // version has expiration warning, newer version exists but is deprecated
          const imageWithNoUpdatePath = find(decoratedAndSortedMachineImages, { name: 'foo', version: '1.3.3' })
          // no newer version exists, version is deprecated but there is no expiration date
          const deprecatedImageWithNoExpiration = find(decoratedAndSortedMachineImages, { name: 'foo', version: '1.3.4' })

          const workers = generateWorkerGroups([
            imageWithExpirationWarning,
            imageWithNoUpdatePath,
            deprecatedImageWithNoExpiration,
          ])
          const expiredWorkerGroups = cloudProfileStore.expiringWorkerGroupsForShoot(workers, cloudProfileRef, true)
          expect(expiredWorkerGroups).toBeInstanceOf(Array)
          expect(expiredWorkerGroups).toHaveLength(2)
          expect(expiredWorkerGroups[0]).toMatchObject({
            ...imageWithExpirationWarning,
            workerName: workers[0].name,
            isValidTerminationDate: true,
            severity: 'warning',
          })
          expect(expiredWorkerGroups[1]).toMatchObject({
            ...imageWithNoUpdatePath,
            workerName: workers[1].name,
            isValidTerminationDate: true,
            severity: 'error',
            supportedVersionAvailable: true,
          })
        })

        it('should be empty array (ignore versions without expiration warning))', () => {
          const previewImage = find(decoratedAndSortedMachineImages, { name: 'gardenlinux', version: '1.2.0' })
          const imageWithExpirationDate = find(decoratedAndSortedMachineImages, { name: 'gardenlinux', version: '1.1.4' })
          const imageWithNoUpdate = find(decoratedAndSortedMachineImages, { name: 'gardenlinux', version: '1.1.5' })
          const workers = generateWorkerGroups([
            previewImage,
            imageWithExpirationDate,
            imageWithNoUpdate,
          ])
          const expiredWorkerGroups = cloudProfileStore.expiringWorkerGroupsForShoot(workers, cloudProfileRef, false)
          expect(expiredWorkerGroups).toBeInstanceOf(Array)
          expect(expiredWorkerGroups).toHaveLength(0)
        })
      })
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
