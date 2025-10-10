//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { ref } from 'vue'
import {
  setActivePinia,
  createPinia,
} from 'pinia'

import { useConfigStore } from '@/store/config'

import { useCloudProfileForMachineImages } from '@/composables/useCloudProfile/useCloudProfileForMachineImages'

import find from 'lodash/find'

describe('composables', () => {
  describe('useCloudProfileForMachineImages', () => {
    let cloudProfile
    let configStore

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

    beforeAll(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2024-01-01'))
      setActivePinia(createPinia())
    })

    afterAll(() => {
      vi.useRealTimers()
    })

    beforeEach(() => {
      configStore = useConfigStore()
      configStore.setConfiguration({
        vendorHints: [{
          type: 'warning',
          message: 'test',
          matchNames: ['gardenlinux'],
        }],
      })

      cloudProfile = ref({
        metadata: {
          name: 'foo',
        },
        kind: 'CloudProfile',
        name: 'foo',
        spec: {
          machineImages,
        },
      })
    })

    describe('#machineImages', () => {
      it('should transform machine images from cloud profile', () => {
        const { machineImages: decoratedAndSortedMachineImages } = useCloudProfileForMachineImages(cloudProfile)
        expect(decoratedAndSortedMachineImages.value).toHaveLength(8)

        const expiredImage = find(decoratedAndSortedMachineImages.value, { name: 'gardenlinux', version: '1.1.2' })
        expect(expiredImage.isExpired).toBe(true)
        expect(expiredImage.isSupported).toBe(false)

        const imageWithExpirationDate = find(decoratedAndSortedMachineImages.value, { name: 'gardenlinux', version: '1.1.4' })
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
        expect(imageWithExpirationDate).toBe(decoratedAndSortedMachineImages.value[2]) // check sorting

        const imageWithNoExpirationDate = find(decoratedAndSortedMachineImages.value, { name: 'gardenlinux', version: '1.1.5' })
        expect(imageWithNoExpirationDate.isExpirationWarning).toBe(false)
        expect(imageWithNoExpirationDate.isExpired).toBe(false)

        const previewImage = find(decoratedAndSortedMachineImages.value, { name: 'gardenlinux', version: '1.2.0' })
        expect(previewImage.isSupported).toBe(false)
        expect(previewImage.isPreview).toBe(true)

        const normalizedImage = find(decoratedAndSortedMachineImages.value, { name: 'foo', version: '1.2.0' })
        expect(normalizedImage).toBeDefined()

        const invalidImage = find(decoratedAndSortedMachineImages.value, { name: 'foo', version: '1.2.x' })
        expect(invalidImage).toBeUndefined()

        const imageWithExpirationWarning = find(decoratedAndSortedMachineImages.value, { name: 'foo', version: '1.3.3' })
        expect(imageWithExpirationWarning.vendorHint).toBeUndefined()
        expect(imageWithExpirationWarning.isSupported).toBe(true)
        expect(imageWithExpirationWarning.isExpirationWarning).toBe(true)

        const deprecatedImageWithNoExpiration = find(decoratedAndSortedMachineImages.value, { name: 'foo', version: '1.3.4' })
        expect(deprecatedImageWithNoExpiration.isDeprecated).toBe(true)
        expect(deprecatedImageWithNoExpiration.isExpirationWarning).toBe(false)
      })
    })

    describe('#expiringWorkerGroupsForShoot', () => {
      let decoratedAndSortedMachineImages

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

      beforeEach(() => {
        const { machineImages: images } = useCloudProfileForMachineImages(cloudProfile)
        decoratedAndSortedMachineImages = images.value
      })

      it('one should be warning level (update available, auto update enabled, expiration warning))', () => {
        const { expiringWorkerGroupsForShoot } = useCloudProfileForMachineImages(cloudProfile)
        const imageWithExpirationWarning = find(decoratedAndSortedMachineImages, { name: 'gardenlinux', version: '1.1.3' })
        const imageWithExpirationDate = find(decoratedAndSortedMachineImages, { name: 'gardenlinux', version: '1.1.4' })
        const imageWithNoUpdate = find(decoratedAndSortedMachineImages, { name: 'gardenlinux', version: '1.1.5' })

        const workers = generateWorkerGroups([
          imageWithExpirationDate,
          imageWithNoUpdate,
          imageWithExpirationWarning,
        ])
        const shootWorkerGroups = ref(workers)
        const imageAutoPatch = ref(false)
        let expiredWorkerGroups = expiringWorkerGroupsForShoot(shootWorkerGroups, imageAutoPatch)
        expect(expiredWorkerGroups.value).toBeInstanceOf(Array)
        expect(expiredWorkerGroups.value).toHaveLength(1)
        expect(expiredWorkerGroups.value[0]).toMatchObject({
          ...imageWithExpirationWarning,
          workerName: workers[2].name,
          isValidTerminationDate: true,
          severity: 'warning',
        })

        imageAutoPatch.value = true
        expiredWorkerGroups = expiringWorkerGroupsForShoot(shootWorkerGroups, imageAutoPatch)
        expect(expiredWorkerGroups.value).toBeInstanceOf(Array)
        expect(expiredWorkerGroups.value).toHaveLength(2) // Now also include auto update information
        expect(expiredWorkerGroups.value[0]).toMatchObject({
          ...imageWithExpirationDate,
          workerName: workers[0].name,
          isValidTerminationDate: true,
          severity: 'info',
        })
        expect(expiredWorkerGroups.value[1]).toMatchObject({
          ...imageWithExpirationWarning,
          workerName: workers[2].name,
          isValidTerminationDate: true,
          severity: 'warning',
        })
      })

      it('one should be warning level (update available, auto update disabled))', () => {
        const { expiringWorkerGroupsForShoot } = useCloudProfileForMachineImages(cloudProfile)
        const imageWithExpirationWarning = find(decoratedAndSortedMachineImages, { name: 'gardenlinux', version: '1.1.3' })
        const imageWithExpirationDate = find(decoratedAndSortedMachineImages, { name: 'gardenlinux', version: '1.1.4' })
        const imageWithNoUpdate = find(decoratedAndSortedMachineImages, { name: 'gardenlinux', version: '1.1.5' })

        const workers = generateWorkerGroups([
          imageWithExpirationDate,
          imageWithNoUpdate,
          imageWithExpirationWarning,
        ])
        const shootWorkerGroups = ref(workers)
        const imageAutoPatch = ref(false)
        const expiredWorkerGroups = expiringWorkerGroupsForShoot(shootWorkerGroups, imageAutoPatch)
        expect(expiredWorkerGroups.value).toBeInstanceOf(Array)
        expect(expiredWorkerGroups.value).toHaveLength(1)
        expect(expiredWorkerGroups.value[0]).toMatchObject({
          ...imageWithExpirationWarning,
          workerName: workers[2].name,
          isValidTerminationDate: true,
          severity: 'warning',
        })
      })

      it('one should be warning level (update available, auto update enabled, expiration warning), one error (no update path)', () => {
        const { expiringWorkerGroupsForShoot } = useCloudProfileForMachineImages(cloudProfile)
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
        const shootWorkerGroups = ref(workers)
        const imageAutoPatch = ref(true)
        const expiredWorkerGroups = expiringWorkerGroupsForShoot(shootWorkerGroups, imageAutoPatch)
        expect(expiredWorkerGroups.value).toBeInstanceOf(Array)
        expect(expiredWorkerGroups.value).toHaveLength(2)
        expect(expiredWorkerGroups.value[0]).toMatchObject({
          ...imageWithExpirationWarning,
          workerName: workers[0].name,
          isValidTerminationDate: true,
          severity: 'warning',
        })
        expect(expiredWorkerGroups.value[1]).toMatchObject({
          ...imageWithNoUpdatePath,
          workerName: workers[1].name,
          isValidTerminationDate: true,
          severity: 'error',
          supportedVersionAvailable: true,
        })
      })

      it('should be empty array (ignore versions without expiration warning))', () => {
        const { expiringWorkerGroupsForShoot } = useCloudProfileForMachineImages(cloudProfile)
        const previewImage = find(decoratedAndSortedMachineImages, { name: 'gardenlinux', version: '1.2.0' })
        const imageWithExpirationDate = find(decoratedAndSortedMachineImages, { name: 'gardenlinux', version: '1.1.4' })
        const imageWithNoUpdate = find(decoratedAndSortedMachineImages, { name: 'gardenlinux', version: '1.1.5' })
        const workers = generateWorkerGroups([
          previewImage,
          imageWithExpirationDate,
          imageWithNoUpdate,
        ])
        const shootWorkerGroups = ref(workers)
        const imageAutoPatch = ref(false)
        const expiredWorkerGroups = expiringWorkerGroupsForShoot(shootWorkerGroups, imageAutoPatch)
        expect(expiredWorkerGroups.value).toBeInstanceOf(Array)
        expect(expiredWorkerGroups.value).toHaveLength(0)
      })
    })
  })
})
