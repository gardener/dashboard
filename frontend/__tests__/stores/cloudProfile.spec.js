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

    function setMachineImages (machineImages) {
      setData({ machineImages })
    }

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
            matchNames: ['suse-jeos', 'suse-chost'],
          }],
        },
      })
      await configStore.fetchConfig()
      cloudProfileStore = useCloudProfileStore()
      cloudProfileStore.list = []
    })

    describe('machineImages', () => {
      const machineImages = [
        {
          name: 'garden-linux',
          versions: [
            {
              version: '2135.6.0',
            },
          ],
        },
        {
          name: 'suse-chost',
          versions: [
            {
              version: '15.1.20190927',
              classification: 'preview',
            },
            {
              version: '15.1.20191027',
              expirationDate: '2119-04-05T01:02:03Z', // not expired
              classification: 'supported',
            },
            {
              version: '15.1.20191127',
              expirationDate: '2019-04-05T01:02:03Z', // expired
            },
          ],
        },
        {
          name: 'foo',
          versions: [
            {
              version: '1.02.3', // invalid version (not semver compatible)
            },
            {
              version: '1.2.3',
            },
          ],
        },
      ]

      beforeEach(() => {
        setMachineImages(machineImages)
      })

      it('should transform machine images from cloud profile', () => {
        const dashboardMachineImages = cloudProfileStore.machineImagesByCloudProfileName('foo')
        expect(dashboardMachineImages).toHaveLength(5)

        const expiredImage = find(dashboardMachineImages, { name: 'suse-chost', version: '15.1.20191127' })
        expect(expiredImage.isExpired).toBe(true)
        expect(expiredImage.isSupported).toBe(false)

        const invalidImage = find(dashboardMachineImages, { name: 'foo', version: '1.02.3' })
        expect(invalidImage).toBeUndefined()

        const suseImage = find(dashboardMachineImages, { name: 'suse-chost', version: '15.1.20191027' })
        expect(suseImage.expirationDate).toBe('2119-04-05T01:02:03Z')
        expect(suseImage.expirationDateString).toBeDefined()
        expect(suseImage.vendorName).toBe('suse-chost')
        expect(suseImage.icon).toBe('suse-chost')
        expect(suseImage.vendorHint).toBeDefined()
        expect(suseImage.vendorHint).toEqual(configStore.vendorHints[0])
        expect(suseImage.classification).toBe('supported')
        expect(suseImage.isSupported).toBe(true)
        expect(suseImage.isDeprecated).toBe(false)
        expect(suseImage.isPreview).toBe(false)
        expect(suseImage).toBe(dashboardMachineImages[2]) // check sorting

        const suseImage2 = find(dashboardMachineImages, { name: 'suse-chost', version: '15.1.20190927' })
        expect(suseImage2.isSupported).toBe(false)
        expect(suseImage2.isPreview).toBe(true)

        const fooImage = find(dashboardMachineImages, { name: 'foo', version: '1.2.3' })
        expect(fooImage.vendorHint).toBeUndefined()
        expect(fooImage.isSupported).toBe(true)
      })
    })

    describe('machineImages - update', () => {
      const machineImages = [
        {
          name: 'gardenlinux',
          versions: [{
            version: '1.1.1',
            expirationDate: '2119-04-05T01:02:03Z', // not expired
            classification: 'supported',
          }],
        },
        {
          name: 'gardenlinux2',
          versions: [{
            version: '1.2.2',
            classification: 'supported',
          }],
        },
        {
          name: 'gardenlinux3',
          versions: [{
            version: '1.3.2',
            classification: 'supported',
          }],
        },
        {
          name: 'gardenlinux4',
          versions: [{
            version: '1.3.3',
            expirationDate: '2119-04-05T01:02:03Z', // not expired
            classification: 'preview',
          }],
        },
        {
          name: 'coreos',
          versions: [{
            version: '3.3.2',
            expirationDate: '2019-04-05T01:02:03Z', // expired
            classification: 'supported',
          }],
        },
        {
          name: 'gardenlinux5',
          versions: [{
            version: '1.3.4',
            classification: 'deprecated',
          }],
        },
        {
          name: 'gardenlinux6',
          versions: [{
            version: '1.4.4',
            classification: 'preview',
          }],
        },
      ]

      beforeEach(() => {
        setMachineImages(machineImages)
      })

      function generateWorkerGroups (machineImages) {
        return machineImages.map(machineImage => {
          return {
            name: 'worker',
            machine: {
              type: 'type',
              image: {
                name: machineImage.name,
                version: machineImage.versions[0].version,
              },
            },
          }
        })
      }

      function flattenMachineImage (machineImage) {
        return {
          name: machineImage.name,
          ...machineImage.versions[0],
        }
      }

      describe('#expiringWorkerGroupsForShoot', () => {
        it('one should be info level (update available, auto update enabled))', () => {
          const workers = generateWorkerGroups([
            machineImages[0],
            machineImages[1],
          ])
          const expiredWorkerGroups = cloudProfileStore.expiringWorkerGroupsForShoot(workers, 'foo', true)

          expect(expiredWorkerGroups).toHaveLength(1)
          expect(expiredWorkerGroups[0]).toEqual(expect.objectContaining({
            ...flattenMachineImage(machineImages[0]),
            workerName: workers[0].name,
            isValidTerminationDate: true,
            severity: 'info',
          }))
        })

        it('one should be warning level (update available, auto update disabled))', () => {
          const workers = generateWorkerGroups([
            machineImages[0],
          ])
          const expiredWorkerGroups = cloudProfileStore.expiringWorkerGroupsForShoot(workers, 'foo', false)
          expect(expiredWorkerGroups).toBeInstanceOf(Array)
          expect(expiredWorkerGroups).toHaveLength(1)
          expect(expiredWorkerGroups[0]).toEqual(expect.objectContaining({
            ...flattenMachineImage(machineImages[0]),
            workerName: workers[0].name,
            isValidTerminationDate: true,
            severity: 'warning',
          }))
        })

        it('one should be info level, two error (update available, auto update enabled))', () => {
          const workers = generateWorkerGroups([
            machineImages[0],
            machineImages[1],
            machineImages[3],
            machineImages[4],
          ])
          const expiredWorkerGroups = cloudProfileStore.expiringWorkerGroupsForShoot(workers, 'foo', true)
          expect(expiredWorkerGroups).toBeInstanceOf(Array)
          expect(expiredWorkerGroups).toHaveLength(3)
          expect(expiredWorkerGroups[0]).toEqual(expect.objectContaining({
            ...flattenMachineImage(machineImages[0]),
            workerName: workers[0].name,
            isValidTerminationDate: true,
            severity: 'info',
          }))
          expect(expiredWorkerGroups[1]).toEqual(expect.objectContaining({
            ...flattenMachineImage(machineImages[3]),
            workerName: workers[2].name,
            isValidTerminationDate: true,
            severity: 'error',
          }))
          expect(expiredWorkerGroups[2]).toEqual(expect.objectContaining({
            ...flattenMachineImage(machineImages[4]),
            workerName: workers[3].name,
            isValidTerminationDate: false,
            severity: 'error',
          }))
        })

        it('should be empty array (ignore versions without expiration date))', () => {
          const workers = generateWorkerGroups([
            machineImages[1],
            machineImages[2],
          ])
          const expiredWorkerGroups = cloudProfileStore.expiringWorkerGroupsForShoot(workers, 'foo', true)
          expect(expiredWorkerGroups).toBeInstanceOf(Array)
          expect(expiredWorkerGroups).toHaveLength(0)
        })
      })
    })

    describe('kubernetes.versions', () => {
      describe('#sortedKubernetesVersions', () => {
        const kubernetesVersions = [
          {
            version: '1.13.4',
            classification: 'deprecated',
          },
          {
            version: '1.14.0',
          },
          {
            expirationDate: '2120-04-12T23:59:59Z', // not expired
            version: '1.16.3',
            classification: 'supported',
          },
          {
            expirationDate: '2019-03-15T23:59:59Z', // expired
            version: '1.16.2',
          },
          {
            version: '1.06.2', // invalid version (not semver compatible)
          },
        ]

        beforeEach(() => {
          setKubernetesVersions(kubernetesVersions)
        })

        it('should filter kubernetes versions from cloud profile', () => {
          const dashboardVersions = cloudProfileStore.sortedKubernetesVersions('foo')
          expect(dashboardVersions).toHaveLength(4)

          const expiredVersion = find(dashboardVersions, { version: '1.16.2' })
          expect(expiredVersion.isExpired).toBe(true)
          expect(expiredVersion.isSupported).toBe(false)

          const invalidVersion = find(dashboardVersions, { version: '1.06.2' })
          expect(invalidVersion).toBeUndefined()

          const supportedVersion = find(dashboardVersions, { version: '1.14.0' })
          expect(supportedVersion.isSupported).toBe(true)

          const kubernetesVersion = find(dashboardVersions, { version: '1.16.3' })
          expect(kubernetesVersion.expirationDate).toBe('2120-04-12T23:59:59Z')
          expect(kubernetesVersion.expirationDateString).toBeDefined()
          expect(kubernetesVersion.isSupported).toBe(true)
          expect(kubernetesVersion).toBe(dashboardVersions[0]) // check sorting
        })
      })
      describe('#availableKubernetesUpdatesForShoot', () => {
        const kubernetesVersions = [
          {
            classification: 'preview',
            version: '2.0.0',
          },
          {
            classification: 'supported',
            version: '1.18.3',
          },
          {
            expirationDate: '2020-01-31T23:59:59Z', // expired
            version: '1.18.2',
          },
          {
            classification: 'supported',
            version: '1.17.7',
          },
          {
            classification: 'supported',
            version: '1.16.10',
          },
          {
            classification: 'deprecated',
            expirationDate: '2120-08-31T23:59:59Z',
            version: '1.16.9',
          },
          {
            version: '1.15.0',
          },
        ]

        beforeEach(() => {
          setKubernetesVersions(kubernetesVersions)
        })

        it('should return available K8sUpdates for given version', () => {
          const availableK8sUpdates = cloudProfileStore.availableKubernetesUpdatesForShoot('1.16.9', 'foo')
          expect(availableK8sUpdates.minor[0]).toEqual(expect.objectContaining(kubernetesVersions[1]))
          expect(availableK8sUpdates.patch[0]).toEqual(expect.objectContaining(kubernetesVersions[4]))
          expect(availableK8sUpdates.major[0]).toEqual(expect.objectContaining(kubernetesVersions[0]))
        })

        it('should differentiate between patch/minor/major available K8sUpdates for given version, filter out expired', () => {
          const availableK8sUpdates = cloudProfileStore.availableKubernetesUpdatesForShoot('1.16.9', 'foo')
          expect(availableK8sUpdates.patch.length).toBe(1)
          expect(availableK8sUpdates.minor.length).toBe(2)
          expect(availableK8sUpdates.major.length).toBe(1)
        })
      })
    })

    describe('kubernetes.versions - update', () => {
      const kubernetesVersions = [
        {
          version: '1.1.1',
          expirationDate: '2119-04-05T01:02:03Z', // not expired
        },
        {
          version: '1.1.2',
          expirationDate: '2119-04-05T01:02:03Z', // not expired
        },
        {
          version: '1.2.4',
        },
        {
          classification: 'preview',
          version: '1.2.5',
        },
        {
          version: '1.3.4',
        },
        {
          version: '1.3.5',
        },
        {
          classification: 'preview',
          version: '1.4.0',
        },
        {
          version: '1.5.0',
          expirationDate: '2019-04-05T01:02:03Z', // expired
        },
        {
          version: '3.3.2',
        },
      ]

      beforeEach(() => {
        setKubernetesVersions(kubernetesVersions)
      })

      describe('#kubernetesVersionIsNotLatestPatch', () => {
        it('selected kubernetes version should be latest (multiple same minor)', () => {
          const result = cloudProfileStore.kubernetesVersionIsNotLatestPatch(kubernetesVersions[1].version, 'foo')
          expect(result).toBe(false)
        })

        it('selected kubernetes version should be latest (one minor, one major, one preview update available)', () => {
          const result = cloudProfileStore.kubernetesVersionIsNotLatestPatch(kubernetesVersions[2].version, 'foo')
          expect(result).toBe(false)
        })

        it('selected kubernetes version should not be latest', () => {
          const result = cloudProfileStore.kubernetesVersionIsNotLatestPatch(kubernetesVersions[0].version, 'foo')
          expect(result).toBe(true)
        })
      })

      describe('#k8sVersionUpdatePathAvailable', () => {
        it('selected kubernetes version should have update path (minor update available)', () => {
          const result = cloudProfileStore.kubernetesVersionUpdatePathAvailable(kubernetesVersions[3].version, 'foo')
          expect(result).toBe(true)
        })

        it('selected kubernetes version should have update path (patch update available)', () => {
          const result = cloudProfileStore.kubernetesVersionUpdatePathAvailable(kubernetesVersions[4].version, 'foo')
          expect(result).toBe(true)
        })

        it('selected kubernetes version should not have update path (minor update is preview)', () => {
          const result = cloudProfileStore.kubernetesVersionUpdatePathAvailable(kubernetesVersions[5].version, 'foo')
          expect(result).toBe(false)
        })

        it('selected kubernetes version should not have update path (no next minor version update available)', () => {
          const result = cloudProfileStore.kubernetesVersionUpdatePathAvailable(kubernetesVersions[7].version, 'foo')
          expect(result).toBe(false)
        })
      })

      describe('#k8sVersionExpirationForShoot', () => {
        it('should be info level (patch avialable, auto update enabled))', () => {
          const versionExpirationWarning = cloudProfileStore.kubernetesVersionExpirationForShoot(kubernetesVersions[0].version, 'foo', true)
          expect(versionExpirationWarning).toEqual({
            expirationDate: kubernetesVersions[0].expirationDate,
            isValidTerminationDate: true,
            severity: 'info',
          })
        })

        it('should be warning level (patch available, auto update disabled))', () => {
          const versionExpirationWarning = cloudProfileStore.kubernetesVersionExpirationForShoot(kubernetesVersions[0].version, 'foo', false)
          expect(versionExpirationWarning).toEqual({
            expirationDate: kubernetesVersions[0].expirationDate,
            isValidTerminationDate: true,
            severity: 'warning',
          })
        })

        it('should be warning level (update available, auto update enabled / disabled))', () => {
          let versionExpirationWarning = cloudProfileStore.kubernetesVersionExpirationForShoot(kubernetesVersions[1].version, 'foo', true)
          expect(versionExpirationWarning).toEqual({
            expirationDate: kubernetesVersions[1].expirationDate,
            isValidTerminationDate: true,
            severity: 'warning',
          })

          versionExpirationWarning = cloudProfileStore.kubernetesVersionExpirationForShoot(kubernetesVersions[1].version, 'foo', false)
          expect(versionExpirationWarning).toEqual({
            expirationDate: kubernetesVersions[1].expirationDate,
            isValidTerminationDate: true,
            severity: 'warning',
          })
        })

        it('should be error level (no update path available))', () => {
          const versionExpirationWarning = cloudProfileStore.kubernetesVersionExpirationForShoot(kubernetesVersions[7].version, 'foo', false)
          expect(versionExpirationWarning).toEqual({
            expirationDate: kubernetesVersions[7].expirationDate,
            isValidTerminationDate: false,
            severity: 'error',
          })
        })

        it('should be error level (version not expired))', () => {
          const versionExpirationWarning = cloudProfileStore.kubernetesVersionExpirationForShoot(kubernetesVersions[8].version, 'foo', true)
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
        const defaultNodesCIDR = cloudProfileStore.defaultNodesCIDRByCloudProfileName({ cloudProfileName })
        expect(defaultNodesCIDR).toBe('10.10.0.0/16')
      })

      it('should return default node cidr from cloud profile', () => {
        setData({
          providerConfig: {
            defaultNodesCIDR: '1.2.3.4/16',
          },
        })
        const defaultNodesCIDR = cloudProfileStore.defaultNodesCIDRByCloudProfileName({ cloudProfileName })
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
