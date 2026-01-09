//
// SPDX-FileCopyrightText: 2025 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { ref } from 'vue'
import {
  setActivePinia,
  createPinia,
} from 'pinia'

import { useConfigStore } from '@/store/config'

import { useMachineImages } from '@/composables/useCloudProfile/useMachineImages.js'

import find from 'lodash/find'

describe('composables', () => {
  describe('useMachineImages', () => {
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
        branding: {
          machineImageVendors: [{
            name: 'foo',
            displayName: 'Foo Inc.',
            icon: 'foo-icon.svg',
            weight: 1,
          }],
        },
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
        const { machineImages: decoratedAndSortedMachineImages } = useMachineImages(cloudProfile)
        expect(decoratedAndSortedMachineImages.value).toHaveLength(8)

        const expiredImage = find(decoratedAndSortedMachineImages.value, { name: 'gardenlinux', version: '1.1.2' })
        expect(expiredImage.isExpired).toBe(true)
        expect(expiredImage.isSupported).toBe(false)

        const imageWithExpirationDate = find(decoratedAndSortedMachineImages.value, { name: 'gardenlinux', version: '1.1.4' })
        expect(imageWithExpirationDate.expirationDate).toBe('2024-04-05T01:02:03Z')
        expect(imageWithExpirationDate.expirationDateString).toBeDefined()
        expect(imageWithExpirationDate.vendorName).toBe('gardenlinux')
        expect(imageWithExpirationDate.icon).toBe('gardenlinux.svg')
        expect(imageWithExpirationDate.displayName).toBe('Garden Linux')
        expect(imageWithExpirationDate.vendorHint).toBeDefined()
        expect(imageWithExpirationDate.vendorHint).toEqual(configStore.vendorHints[0])
        expect(imageWithExpirationDate.classification).toBe('supported')
        expect(imageWithExpirationDate.isSupported).toBe(true)
        expect(imageWithExpirationDate.isDeprecated).toBe(false)
        expect(imageWithExpirationDate.isPreview).toBe(false)
        expect(imageWithExpirationDate.isExpirationWarning).toBe(false)
        expect(imageWithExpirationDate).toBe(decoratedAndSortedMachineImages.value[5]) // check sorting

        const imageWithNoExpirationDate = find(decoratedAndSortedMachineImages.value, { name: 'gardenlinux', version: '1.1.5' })
        expect(imageWithNoExpirationDate.isExpirationWarning).toBe(false)
        expect(imageWithNoExpirationDate.isExpired).toBe(false)

        const previewImage = find(decoratedAndSortedMachineImages.value, { name: 'gardenlinux', version: '1.2.0' })
        expect(previewImage.isSupported).toBe(false)
        expect(previewImage.isPreview).toBe(true)

        const normalizedImage = find(decoratedAndSortedMachineImages.value, { name: 'foo', version: '1.2.0' })
        expect(normalizedImage).toBeDefined()

        expect(normalizedImage.icon).toBe('foo-icon.svg')
        expect(normalizedImage.displayName).toBe('Foo Inc.')

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
  })
})
