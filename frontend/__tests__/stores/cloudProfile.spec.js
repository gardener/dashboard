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
import {
  firstItemMatchingVersionClassification,
  mapAccessRestrictionForInput,
} from '@/store/cloudProfile/helper'

import { useApi } from '@/composables/useApi'

import { find } from '@/lodash'

describe('stores', () => {
  describe('cloudProfile', () => {
    const namespace = 'default'

    const api = useApi()
    let mockGetConfiguration // eslint-disable-line no-unused-vars
    let authzStore
    let configStore
    let cloudProfileStore

    function setData (data) {
      cloudProfileStore.list = [{
        metadata: {
          name: 'foo',
        },
        data,
      }]
    }

    function setKubernetesVersions (kubernetesVersions) {
      setData({
        kubernetes: {
          versions: kubernetesVersions,
        },
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
      mockGetConfiguration = vi.spyOn(api, 'getConfiguration').mockResolvedValue({
        data: {
          defaultNodesCIDR: '10.10.0.0/16',
          vendorHints: [{
            type: 'warning',
            message: 'test',
            matchNames: ['gardenlinux'],
          }],
        },
      })
      await configStore.fetchConfig()
      cloudProfileStore = useCloudProfileStore()
      cloudProfileStore.list = []
    })

    describe('machineImages', () => {
      function setMachineImages (machineImages) {
        setData({ machineImages })
      }

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
              version: '1.02', // incompatible version (not semver compatible - can be harmonized)
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
        decoratedAndSortedMachineImages = cloudProfileStore.machineImagesByCloudProfileName('foo')
      })

      it('should transform machine images from cloud profile', () => {
        expect(decoratedAndSortedMachineImages).toHaveLength(8)

        const expiredImage = find(decoratedAndSortedMachineImages, { name: 'gardenlinux', version: '1.1.2' })
        expect(expiredImage.isExpired).toBe(true)
        expect(expiredImage.isSupported).toBe(false)

        const imageWithExpirationWarning = find(decoratedAndSortedMachineImages, { name: 'gardenlinux', version: '1.1.3' })
        expect(imageWithExpirationWarning.isExpirationWarning).toBe(true)

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

        const previewImage = find(decoratedAndSortedMachineImages, { name: 'gardenlinux', version: '1.2.0' })
        expect(previewImage.isSupported).toBe(false)
        expect(previewImage.isPreview).toBe(true)

        const normalizedImage = find(decoratedAndSortedMachineImages, { name: 'foo', version: '1.2.0' })
        expect(normalizedImage).toBeDefined()

        const invalidImage = find(decoratedAndSortedMachineImages, { name: 'foo', version: '1.2.x' })
        expect(invalidImage).toBeUndefined()

        const fooImageWithExpirationWarning = find(decoratedAndSortedMachineImages, { name: 'foo', version: '1.3.3' })
        expect(fooImageWithExpirationWarning.vendorHint).toBeUndefined()
        expect(fooImageWithExpirationWarning.isSupported).toBe(true)
        expect(fooImageWithExpirationWarning.isExpirationWarning).toBe(true)

        const deprecatedFooImageWithNoExpiration = find(decoratedAndSortedMachineImages, { name: 'foo', version: '1.3.4' })
        expect(deprecatedFooImageWithNoExpiration.isDeprecated).toBe(true)
        expect(deprecatedFooImageWithNoExpiration.isExpirationWarning).toBe(true)
      })

      function generateWorkerGroups (machineImages) {
        return machineImages.map(machineImage => {
          return {
            name: 'worker',
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
        it('one should be info level (update available, auto update enabled))', () => {
          const imageWithExpirationWarning = find(decoratedAndSortedMachineImages, { name: 'gardenlinux', version: '1.1.3' })
          const imageWithExpirationDate = find(decoratedAndSortedMachineImages, { name: 'gardenlinux', version: '1.1.4' })
          const imageWithNoUpdate = find(decoratedAndSortedMachineImages, { name: 'gardenlinux', version: '1.1.5' })

          const workers = generateWorkerGroups([
            imageWithExpirationDate,
            imageWithNoUpdate,
            imageWithExpirationWarning,
          ])
          const expiredWorkerGroups = cloudProfileStore.expiringWorkerGroupsForShoot(workers, 'foo', true)
          expect(expiredWorkerGroups).toBeInstanceOf(Array)
          expect(expiredWorkerGroups).toHaveLength(1)
          expect(expiredWorkerGroups[0]).toMatchObject({
            ...imageWithExpirationWarning,
            workerName: workers[0].name,
            isValidTerminationDate: true,
            severity: 'info',
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
          const expiredWorkerGroups = cloudProfileStore.expiringWorkerGroupsForShoot(workers, 'foo', false)
          expect(expiredWorkerGroups).toBeInstanceOf(Array)
          expect(expiredWorkerGroups).toHaveLength(1)
          expect(expiredWorkerGroups[0]).toMatchObject({
            ...imageWithExpirationWarning,
            workerName: workers[0].name,
            isValidTerminationDate: true,
            severity: 'warning',
          })
        })

        it('one should be info level (update available, auto update enabled), two error (no update path)', () => {
          const imageWithExpirationWarning = find(decoratedAndSortedMachineImages, { name: 'gardenlinux', version: '1.1.3' })
          // version has expiration warning, newer version exists but is deprecated
          const imageWithNoUpdatePath = find(decoratedAndSortedMachineImages, { name: 'foo', version: '1.3.3' })
          // no newer version exists
          const deprecatedImageWithNoExpiration = find(decoratedAndSortedMachineImages, { name: 'foo', version: '1.3.4' })

          const workers = generateWorkerGroups([
            imageWithExpirationWarning,
            imageWithNoUpdatePath,
            deprecatedImageWithNoExpiration,
          ])
          const expiredWorkerGroups = cloudProfileStore.expiringWorkerGroupsForShoot(workers, 'foo', true)
          expect(expiredWorkerGroups).toBeInstanceOf(Array)
          expect(expiredWorkerGroups).toHaveLength(3)
          expect(expiredWorkerGroups[0]).toMatchObject({
            ...imageWithExpirationWarning,
            workerName: workers[0].name,
            isValidTerminationDate: true,
            severity: 'info',
          })
          expect(expiredWorkerGroups[1]).toMatchObject({
            ...imageWithNoUpdatePath,
            workerName: workers[1].name,
            isValidTerminationDate: true,
            severity: 'error',
          })
          expect(expiredWorkerGroups[2]).toMatchObject({
            ...deprecatedImageWithNoExpiration,
            workerName: workers[2].name,
            isValidTerminationDate: false,
            severity: 'error',
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
          const expiredWorkerGroups = cloudProfileStore.expiringWorkerGroupsForShoot(workers, 'foo', true)
          expect(expiredWorkerGroups).toBeInstanceOf(Array)
          expect(expiredWorkerGroups).toHaveLength(0)
        })
      })
    })

    describe('kubernetes.versions', () => {
      const preview22Version = {
        classification: 'preview',
        version: '2.2.0',
      }
      const supported20Version = {
        version: '2.0.0',
        classification: 'supported',
      }
      const deprecated181VersionWithnoExpiration = {
        version: '1.18.1',
        classification: 'deprecated',
      }
      const supported18VersionWithExpirationWarning = {
        version: '1.18.0',
        classification: 'supported',
        expirationDate: '2024-01-15T23:59:59Z', // not expired but expiration warning
      }
      const supported17VersionWithExpirationWarning = {
        version: '1.17.0',
        classification: 'supported',
        expirationDate: '2024-01-15T23:59:59Z', // not expired but expiration warning
      }
      const preview166Version = {
        version: '1.16.6',
        classification: 'preview',
      }
      const supported165VersionWithExpiration = {
        expirationDate: '2024-04-12T23:59:59Z', // not expired
        version: '1.16.5',
        classification: 'supported',
      }
      const unclassified164VersionWithExpiration = {
        expirationDate: '2024-04-12T23:59:59Z', // not expired
        version: '1.16.4',
      }
      const deprecatedVersion = {
        version: '1.16.3',
        classification: 'deprecated',
      }
      const supported162VersionWithExpirationWarning = {
        expirationDate: '2024-01-15T23:59:59Z', // not expired but expiration warning
        version: '1.16.2',
        classification: 'supported',
      }
      const expiredVersion = {
        expirationDate: '2023-03-15T23:59:59Z', // expired
        version: '1.16.1',
      }
      const oldestVersion = {
        version: '1.16.0',
      }
      const invalidVersion = {
        version: '1.06.2',
      }
      const kubernetesVersions = [
        supported165VersionWithExpiration, // 1.16.5 on top to test sorting
        preview22Version, // 2.1.0
        supported20Version, // 2.0.0
        supported18VersionWithExpirationWarning, // 1.18.0
        deprecated181VersionWithnoExpiration, // 1.18.1
        supported17VersionWithExpirationWarning, // 1.17.0
        preview166Version, // 1.16.6
        unclassified164VersionWithExpiration, // 1.16.4
        deprecatedVersion, // 1.16.3
        supported162VersionWithExpirationWarning, // 1.16.2
        expiredVersion, // 1.16.1
        invalidVersion, // 1.06.2 not semver compatible
        oldestVersion, // 1.16.0
      ]

      beforeEach(() => {
        setKubernetesVersions(kubernetesVersions)
      })

      describe('#sortedKubernetesVersions', () => {
        it('should filter and sort kubernetes versions from cloud profile', () => {
          const decoratedAndSortedVersions = cloudProfileStore.sortedKubernetesVersions('foo')
          expect(decoratedAndSortedVersions).toHaveLength(12)

          const expiredDecoratedVersion = find(decoratedAndSortedVersions, expiredVersion)
          expect(expiredDecoratedVersion.isExpired).toBe(true)
          expect(expiredDecoratedVersion.isSupported).toBe(false)

          const decoratedVersionWithExpirationWarning = find(decoratedAndSortedVersions, supported162VersionWithExpirationWarning)
          expect(decoratedVersionWithExpirationWarning.isExpirationWarning).toBe(true)

          const invalidDecoratedVersion = find(decoratedAndSortedVersions, invalidVersion)
          expect(invalidDecoratedVersion).toBeUndefined()

          const unclassifiedDecoratedVersion = find(decoratedAndSortedVersions, unclassified164VersionWithExpiration)
          expect(unclassifiedDecoratedVersion.isSupported).toBe(true)

          const previewDecoratedVersion = find(decoratedAndSortedVersions, preview22Version)
          expect(previewDecoratedVersion.isPreview).toBe(true)

          const decoratedSupported165Version = find(decoratedAndSortedVersions, supported165VersionWithExpiration)
          expect(decoratedSupported165Version.expirationDate).toBe('2024-04-12T23:59:59Z')
          expect(decoratedSupported165Version.expirationDateString).toBeDefined()
          expect(decoratedSupported165Version.isSupported).toBe(true)
          expect(decoratedSupported165Version).toBe(decoratedAndSortedVersions[6]) // check sorting
        })
      })
      describe('#availableKubernetesUpdatesForShoot', () => {
        it('should differentiate between patch/minor/major available K8sUpdates for given version, filter out expired', () => {
          const availableK8sUpdates = cloudProfileStore.availableKubernetesUpdatesForShoot(oldestVersion.version, 'foo')
          expect(availableK8sUpdates.patch.length).toBe(5)
          expect(availableK8sUpdates.minor.length).toBe(3)
          expect(availableK8sUpdates.major.length).toBe(2)
        })

        it('should return available K8sUpdates for given version', () => {
          const availableK8sUpdates = cloudProfileStore.availableKubernetesUpdatesForShoot(unclassified164VersionWithExpiration.version, 'foo')
          expect(availableK8sUpdates.patch[0]).toEqual(expect.objectContaining(supported165VersionWithExpiration))
          expect(availableK8sUpdates.minor[0]).toEqual(expect.objectContaining(supported18VersionWithExpirationWarning))
          expect(availableK8sUpdates.major[0]).toEqual(expect.objectContaining(preview22Version))
        })
      })
      describe('#kubernetesVersionIsNotLatestPatch', () => {
        it('selected kubernetes version should be latest (one minor, one major, one preview patch update available)', () => {
          const result = cloudProfileStore.kubernetesVersionIsNotLatestPatch(supported165VersionWithExpiration.version, 'foo')
          expect(result).toBe(false)
        })

        it('selected kubernetes version should not be latest', () => {
          const result = cloudProfileStore.kubernetesVersionIsNotLatestPatch(supported162VersionWithExpirationWarning.version, 'foo')
          expect(result).toBe(true)
        })
      })

      describe('#k8sVersionUpdatePathAvailable', () => {
        it('selected kubernetes version should have update path (minor update available)', () => {
          const result = cloudProfileStore.kubernetesVersionUpdatePathAvailable(supported17VersionWithExpirationWarning.version, 'foo')
          expect(result).toBe(true)
        })

        it('selected kubernetes version should have update path (patch update available)', () => {
          const result = cloudProfileStore.kubernetesVersionUpdatePathAvailable(unclassified164VersionWithExpiration.version, 'foo')
          expect(result).toBe(true)
        })

        it('selected kubernetes version should not have update path (minor update is preview)', () => {
          const result = cloudProfileStore.kubernetesVersionUpdatePathAvailable(supported20Version.version, 'foo')
          expect(result).toBe(false)
        })

        it('selected kubernetes version should not have update path (no newer version available)', () => {
          const result = cloudProfileStore.kubernetesVersionUpdatePathAvailable(deprecated181VersionWithnoExpiration.version, 'foo')
          expect(result).toBe(false)
        })
      })

      describe('#k8sVersionExpirationForShoot', () => {
        it('should be info level (patch available, auto update enabled))', () => {
          const versionExpirationWarning = cloudProfileStore.kubernetesVersionExpirationForShoot(supported162VersionWithExpirationWarning.version, 'foo', true)
          expect(versionExpirationWarning).toEqual({
            expirationDate: supported162VersionWithExpirationWarning.expirationDate,
            isValidTerminationDate: true,
            severity: 'info',
          })
        })

        it('should be warning level (patch available, auto update disabled))', () => {
          const versionExpirationWarning = cloudProfileStore.kubernetesVersionExpirationForShoot(supported162VersionWithExpirationWarning.version, 'foo', false)
          expect(versionExpirationWarning).toEqual({
            expirationDate: supported162VersionWithExpirationWarning.expirationDate,
            isValidTerminationDate: true,
            severity: 'warning',
          })
        })

        it('should be warning level (update available, auto update enabled / disabled))', () => {
          let versionExpirationWarning = cloudProfileStore.kubernetesVersionExpirationForShoot(supported17VersionWithExpirationWarning.version, 'foo', true)
          expect(versionExpirationWarning).toEqual({
            expirationDate: supported17VersionWithExpirationWarning.expirationDate,
            isValidTerminationDate: true,
            severity: 'warning',
          })

          versionExpirationWarning = cloudProfileStore.kubernetesVersionExpirationForShoot(supported17VersionWithExpirationWarning.version, 'foo', false)
          expect(versionExpirationWarning).toEqual({
            expirationDate: supported17VersionWithExpirationWarning.expirationDate,
            isValidTerminationDate: true,
            severity: 'warning',
          })
        })

        it('should be error level (only deprecated newer version available))', () => {
          const versionExpirationWarning = cloudProfileStore.kubernetesVersionExpirationForShoot(supported18VersionWithExpirationWarning.version, 'foo', false)
          expect(versionExpirationWarning).toEqual({
            expirationDate: supported18VersionWithExpirationWarning.expirationDate,
            isValidTerminationDate: true,
            severity: 'error',
          })
        })

        it('should be error level (no update path available))', () => {
          const versionExpirationWarning = cloudProfileStore.kubernetesVersionExpirationForShoot(deprecated181VersionWithnoExpiration.version, 'foo', false)
          expect(versionExpirationWarning).toEqual({
            expirationDate: undefined,
            isValidTerminationDate: false,
            severity: 'error',
          })
        })

        it('should not have warning (version not expired))', () => {
          const versionExpirationWarning = cloudProfileStore.kubernetesVersionExpirationForShoot(unclassified164VersionWithExpiration.version, 'foo', true)
          expect(versionExpirationWarning).toBeUndefined()
        })

        it('should not have warning (version has no expiration))', () => {
          const versionExpirationWarning = cloudProfileStore.kubernetesVersionExpirationForShoot(oldestVersion.version, 'foo', true)
          expect(versionExpirationWarning).toBeUndefined()
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
        setData({
          machineTypes,
          volumeTypes,
          regions,
        })
      })

      it('should return machineTypes by region and zones from cloud profile', () => {
        let dashboardMachineTypes = cloudProfileStore.machineTypesByCloudProfileName({ cloudProfileName: 'foo' })
        expect(dashboardMachineTypes).toHaveLength(4)

        dashboardMachineTypes = cloudProfileStore.machineTypesByCloudProfileNameAndRegionAndArchitecture({ cloudProfileName: 'foo', region: 'region1', architecture: 'amd64' })
        expect(dashboardMachineTypes).toHaveLength(2)
        expect(dashboardMachineTypes[0].name).toBe('machineType1')
        expect(dashboardMachineTypes[1].name).toBe('machineType3')

        dashboardMachineTypes = cloudProfileStore.machineTypesByCloudProfileNameAndRegionAndArchitecture({ cloudProfileName: 'foo', region: 'region2', architecture: 'arm64' })
        expect(dashboardMachineTypes).toHaveLength(1)
        expect(dashboardMachineTypes[0].name).toBe('machineType4')
      })

      it('should return volumeTypes by region and zones from cloud profile', () => {
        let dashboardVolumeTypes = cloudProfileStore.volumeTypesByCloudProfileName({ cloudProfileName: 'foo' })
        expect(dashboardVolumeTypes).toHaveLength(3)

        dashboardVolumeTypes = cloudProfileStore.volumeTypesByCloudProfileNameAndRegion({ cloudProfileName: 'foo', region: 'region1' })
        expect(dashboardVolumeTypes).toHaveLength(2)

        dashboardVolumeTypes = cloudProfileStore.volumeTypesByCloudProfileNameAndRegion({ cloudProfileName: 'foo', region: 'region2' })
        expect(dashboardVolumeTypes).toHaveLength(3)
      })

      it('should return an empty machineType / volumeType array if no cloud profile is provided', () => {
        const items = cloudProfileStore.machineTypesByCloudProfileName({})
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
        setData({
          providerConfig: {
            constraints: {
              floatingPools,
              loadBalancerProviders,
            },
          },
        })
      })

      it('should return floating pool names by region and domain from cloud profile', () => {
        const cloudProfileName = 'foo'

        let region = 'fooRegion'
        let secretDomain = 'fooDomain'
        let dashboardFloatingPools = cloudProfileStore.floatingPoolNamesByCloudProfileNameAndRegionAndDomain({ cloudProfileName, region, secretDomain })
        expect(dashboardFloatingPools).toHaveLength(1)
        expect(dashboardFloatingPools[0]).toBe('global FP')

        region = 'region1'
        secretDomain = 'fooDomain'
        dashboardFloatingPools = cloudProfileStore.floatingPoolNamesByCloudProfileNameAndRegionAndDomain({ cloudProfileName, region, secretDomain })
        expect(dashboardFloatingPools).toHaveLength(1)
        expect(dashboardFloatingPools[0]).toBe('regional FP')

        region = 'region2'
        secretDomain = 'fooDomain'
        dashboardFloatingPools = cloudProfileStore.floatingPoolNamesByCloudProfileNameAndRegionAndDomain({ cloudProfileName, region, secretDomain })
        expect(dashboardFloatingPools).toHaveLength(2)
        expect(dashboardFloatingPools[0]).toBe('global FP')
        expect(dashboardFloatingPools[1]).toBe('regional non constraining FP')

        region = 'fooRegion'
        secretDomain = 'domain1'
        dashboardFloatingPools = cloudProfileStore.floatingPoolNamesByCloudProfileNameAndRegionAndDomain({ cloudProfileName, region, secretDomain })
        expect(dashboardFloatingPools).toHaveLength(1)
        expect(dashboardFloatingPools[0]).toBe('domain specific FP')

        region = 'fooRegion'
        secretDomain = 'domain2'
        dashboardFloatingPools = cloudProfileStore.floatingPoolNamesByCloudProfileNameAndRegionAndDomain({ cloudProfileName, region, secretDomain })
        expect(dashboardFloatingPools).toHaveLength(2)
        expect(dashboardFloatingPools[0]).toBe('global FP')
        expect(dashboardFloatingPools[1]).toBe('domain specific non constraining FP')

        region = 'region3'
        secretDomain = 'domain3'
        dashboardFloatingPools = cloudProfileStore.floatingPoolNamesByCloudProfileNameAndRegionAndDomain({ cloudProfileName, region, secretDomain })
        expect(dashboardFloatingPools).toHaveLength(2)
        expect(dashboardFloatingPools[0]).toBe('domain specific, regional FP')
        expect(dashboardFloatingPools[1]).toBe('additional domain specific, regional FP')

        region = 'region4'
        secretDomain = 'domain4'
        dashboardFloatingPools = cloudProfileStore.floatingPoolNamesByCloudProfileNameAndRegionAndDomain({ cloudProfileName, region, secretDomain })
        expect(dashboardFloatingPools).toHaveLength(2)
        expect(dashboardFloatingPools[0]).toBe('global FP')
        expect(dashboardFloatingPools[1]).toBe('domain specific, regional non constraining FP')
      })

      it('should return load balancer provider names by region from cloud profile', () => {
        const cloudProfileName = 'foo'

        let region = 'fooRegion'
        let dashboardLoadBalancerProviderNames = cloudProfileStore.loadBalancerProviderNamesByCloudProfileNameAndRegion({ cloudProfileName, region })
        expect(dashboardLoadBalancerProviderNames).toHaveLength(1)
        expect(dashboardLoadBalancerProviderNames[0]).toBe('global LB')

        region = 'region1'
        dashboardLoadBalancerProviderNames = cloudProfileStore.loadBalancerProviderNamesByCloudProfileNameAndRegion({ cloudProfileName, region })
        expect(dashboardLoadBalancerProviderNames).toHaveLength(2)
        expect(dashboardLoadBalancerProviderNames[0]).toBe('regional LB')
        expect(dashboardLoadBalancerProviderNames[1]).toBe('additional regional LB')

        region = 'region2'
        dashboardLoadBalancerProviderNames = cloudProfileStore.loadBalancerProviderNamesByCloudProfileNameAndRegion({ cloudProfileName, region })
        expect(dashboardLoadBalancerProviderNames).toHaveLength(1)
        expect(dashboardLoadBalancerProviderNames[0]).toBe('other regional LB')
      })
    })

    describe('providerConfig.defaultNodesCIDR', () => {
      const cloudProfileName = 'foo'

      it('should return default node cidr from config', async () => {
        const defaultNodesCIDR = cloudProfileStore.getDefaultNodesCIDR({ cloudProfileName })
        expect(defaultNodesCIDR).toBe('10.10.0.0/16')
      })

      it('should return default node cidr from cloud profile', () => {
        setData({
          providerConfig: {
            defaultNodesCIDR: '1.2.3.4/16',
          },
        })
        const defaultNodesCIDR = cloudProfileStore.getDefaultNodesCIDR({ cloudProfileName })
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

      describe('#mapAccessRestrictionForInput', () => {
        let definition
        let shootResource

        beforeEach(() => {
          definition = {
            key: 'foo',
            input: {
              inverted: false,
            },
            options: [
              {
                key: 'foo-option-1',
                input: {
                  inverted: false,
                },
              },
              {
                key: 'foo-option-2',
                input: {
                  inverted: true,
                },
              },
              {
                key: 'foo-option-3',
                input: {
                  inverted: true,
                },
              },
              {
                key: 'foo-option-4',
                input: {
                  inverted: true,
                },
              },
            ],
          }

          shootResource = {
            metadata: {
              annotations: {
                'foo-option-1': 'false',
                'foo-option-2': 'false',
                'foo-option-3': 'true',
              },
            },
            spec: {
              seedSelector: {
                matchLabels: {
                  foo: 'true',
                },
              },
            },
          }
        })

        it('should map definition and shoot resources to access restriction data model', () => {
          const accessRestrictionPair = mapAccessRestrictionForInput(definition, shootResource)
          expect(accessRestrictionPair).toEqual([
            'foo',
            {
              value: true,
              options: {
                'foo-option-1': {
                  value: false,
                },
                'foo-option-2': {
                  value: true, // value inverted as defined in definition
                },
                'foo-option-3': {
                  value: false, // value inverted as defined in definition
                },
                'foo-option-4': {
                  value: false, // value not set in spec always maps to false
                },
              },
            },
          ])
        })

        it('should invert access restriction', () => {
          definition.input.inverted = true
          const [, accessRestriction] = mapAccessRestrictionForInput(definition, shootResource)
          expect(accessRestriction.value).toBe(false)
        })

        it('should not invert option', () => {
          definition.options[1].input.inverted = false
          const [, accessRestriction] = mapAccessRestrictionForInput(definition, shootResource)
          expect(accessRestriction.options['foo-option-2'].value).toBe(false)
        })

        it('should invert option', () => {
          definition.options[1].input.inverted = true
          const [, accessRestriction] = mapAccessRestrictionForInput(definition, shootResource)
          expect(accessRestriction.options['foo-option-2'].value).toBe(true)
        })
      })
    })
  })
})
