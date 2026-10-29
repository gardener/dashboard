//
// SPDX-FileCopyrightText: Contributors to the Gardener project
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

    describe('#useFilteredMachineImages', () => {
      it('should fall back to profile default capabilities when machine type has no capabilities', () => {
        cloudProfile.value = {
          ...cloudProfile.value,
          spec: {
            machineImages: [
              {
                name: 'gardenlinux',
                versions: [
                  {
                    version: '1.0.0',
                    classification: 'supported',
                    capabilityFlavors: [{ hypervisorType: ['gen2'] }],
                  },
                ],
              },
            ],
            machineCapabilities: [
              { name: 'hypervisorType', values: ['gen2', 'gen1'] },
            ],
          },
        }

        const { useFilteredMachineImages } = useMachineImages(cloudProfile)

        // Machine type without capabilities — should fall back to profile defaults
        const filteredImages = useFilteredMachineImages({})
        expect(filteredImages).toHaveLength(1)
        expect(filteredImages[0].name).toBe('gardenlinux')
      })

      it('should reject image when neither machine type nor profile defaults include required capability', () => {
        cloudProfile.value = {
          ...cloudProfile.value,
          spec: {
            machineImages: [
              {
                name: 'gardenlinux',
                versions: [
                  {
                    version: '1.0.0',
                    classification: 'supported',
                    capabilityFlavors: [{ hypervisorType: ['gen2'] }],
                  },
                ],
              },
            ],
            machineCapabilities: [
              { name: 'hypervisorType', values: ['gen1'] },
            ],
          },
        }

        const { useFilteredMachineImages } = useMachineImages(cloudProfile)

        // Profile default only has gen1, image requires gen2
        const filteredImages = useFilteredMachineImages({})
        expect(filteredImages).toHaveLength(0)
      })

      it('should use machine type capabilities over profile defaults', () => {
        cloudProfile.value = {
          ...cloudProfile.value,
          spec: {
            machineImages: [
              {
                name: 'gardenlinux',
                versions: [
                  {
                    version: '1.0.0',
                    classification: 'supported',
                    capabilityFlavors: [{ hypervisorType: ['gen2'] }],
                  },
                ],
              },
            ],
            machineCapabilities: [
              { name: 'hypervisorType', values: ['gen1'] }, // Profile default does NOT include gen2
            ],
          },
        }

        const { useFilteredMachineImages } = useMachineImages(cloudProfile)

        // Machine type explicitly supports gen2 — should match directly
        const filteredImages = useFilteredMachineImages({
          capabilities: { hypervisorType: ['gen2'] },
        })
        expect(filteredImages).toHaveLength(1)
        expect(filteredImages[0].name).toBe('gardenlinux')
      })

      it('should reject image when machine type explicitly lacks required capability even if profile default includes it', () => {
        cloudProfile.value = {
          ...cloudProfile.value,
          spec: {
            machineImages: [
              {
                name: 'gardenlinux',
                versions: [
                  {
                    version: '1.0.0',
                    classification: 'supported',
                    capabilityFlavors: [{ hypervisorType: ['gen2'] }],
                  },
                ],
              },
            ],
            machineCapabilities: [
              { name: 'hypervisorType', values: ['gen2', 'gen1'] }, // Profile default includes gen2
            ],
          },
        }

        const { useFilteredMachineImages } = useMachineImages(cloudProfile)

        // Machine type explicitly supports only gen1 — profile default must NOT be consulted
        const filteredImages = useFilteredMachineImages({
          capabilities: { hypervisorType: ['gen1'] },
        })
        expect(filteredImages).toHaveLength(0)
      })

      it('should include images without capabilityFlavors when machine type has no architecture info', () => {
        cloudProfile.value = {
          ...cloudProfile.value,
          spec: {
            machineImages: [
              {
                name: 'gardenlinux',
                versions: [
                  {
                    version: '1.0.0',
                    classification: 'supported',
                    // No capabilityFlavors — falls back to architecture check
                  },
                ],
              },
            ],
          },
        }

        const { useFilteredMachineImages } = useMachineImages(cloudProfile)

        // Machine type has no architecture info and no profile defaults — image should be included
        const filteredImages = useFilteredMachineImages({})
        expect(filteredImages).toHaveLength(1)
      })

      it('should filter images without capabilityFlavors by machine type capabilities.architecture', () => {
        cloudProfile.value = {
          ...cloudProfile.value,
          spec: {
            machineImages: [
              {
                name: 'gardenlinux',
                versions: [
                  {
                    version: '1.0.0',
                    classification: 'supported',
                    architectures: ['amd64'],
                    // No capabilityFlavors
                  },
                ],
              },
            ],
          },
        }

        const { useFilteredMachineImages } = useMachineImages(cloudProfile)

        // Machine type with matching architecture
        const matchingImages = useFilteredMachineImages({
          capabilities: { architecture: ['amd64'] },
        })
        expect(matchingImages).toHaveLength(1)
        expect(matchingImages[0].name).toBe('gardenlinux')

        // Machine type with non-matching architecture
        const nonMatchingImages = useFilteredMachineImages({
          capabilities: { architecture: ['arm64'] },
        })
        expect(nonMatchingImages).toHaveLength(0)
      })

      it('should filter images without capabilityFlavors by profile default architecture', () => {
        cloudProfile.value = {
          ...cloudProfile.value,
          spec: {
            machineImages: [
              {
                name: 'gardenlinux',
                versions: [
                  {
                    version: '1.0.0',
                    classification: 'supported',
                    architectures: ['arm64'],
                    // No capabilityFlavors
                  },
                ],
              },
            ],
            machineCapabilities: [
              { name: 'architecture', values: ['arm64'] },
            ],
          },
        }

        const { useFilteredMachineImages } = useMachineImages(cloudProfile)

        // Machine type without capabilities — should use profile default architecture
        const filteredImages = useFilteredMachineImages({})
        expect(filteredImages).toHaveLength(1)
        expect(filteredImages[0].name).toBe('gardenlinux')
      })

      it('should filter images without capabilityFlavors by deprecated type.architecture', () => {
        cloudProfile.value = {
          ...cloudProfile.value,
          spec: {
            machineImages: [
              {
                name: 'gardenlinux',
                versions: [
                  {
                    version: '1.0.0',
                    classification: 'supported',
                    architectures: ['arm64'],
                    // No capabilityFlavors
                  },
                ],
              },
            ],
          },
        }

        const { useFilteredMachineImages } = useMachineImages(cloudProfile)

        // Machine type with deprecated architecture field — should reject amd64 image
        const nonMatchingImages = useFilteredMachineImages({ architecture: 'amd64' })
        expect(nonMatchingImages).toHaveLength(0)

        // Machine type with matching deprecated architecture field
        const matchingImages = useFilteredMachineImages({ architecture: 'arm64' })
        expect(matchingImages).toHaveLength(1)
      })
    })

    describe('#useDefaultMachineImage', () => {
      it('should inherit the sole profile architecture for capability flavors without architecture', () => {
        cloudProfile.value = {
          ...cloudProfile.value,
          spec: {
            machineImages: [
              {
                name: 'gardenlinux',
                versions: [
                  {
                    version: '1.0.0',
                    classification: 'supported',
                    capabilityFlavors: [{ storageAccess: ['NVMe'] }],
                  },
                ],
              },
            ],
            machineCapabilities: [
              { name: 'architecture', values: ['amd64'] },
              { name: 'storageAccess', values: ['NVMe'] },
            ],
          },
        }

        const { useDefaultMachineImage, useFilteredMachineImages } = useMachineImages(cloudProfile)
        const machineType = ref({})
        const architecture = ref('amd64')

        expect(useFilteredMachineImages(machineType.value, architecture.value)).toHaveLength(1)
        expect(useDefaultMachineImage(machineType, architecture).value).toMatchObject({ name: 'gardenlinux' })
      })

      it('should return image with capabilityFlavors architecture when legacy architectures field is omitted', () => {
        cloudProfile.value = {
          ...cloudProfile.value,
          spec: {
            machineImages: [
              {
                name: 'gardenlinux',
                versions: [
                  {
                    version: '1.0.0',
                    classification: 'supported',
                    capabilityFlavors: [{ architecture: ['amd64'] }],
                    // No deprecated architectures field
                  },
                ],
              },
            ],
          },
        }

        const { useDefaultMachineImage } = useMachineImages(cloudProfile)
        const machineType = ref({})
        const architecture = ref('amd64')

        const defaultImage = useDefaultMachineImage(machineType, architecture)
        expect(defaultImage.value).toBeDefined()
        expect(defaultImage.value.name).toBe('gardenlinux')
      })

      it('should reject image with capabilityFlavors architecture when architecture does not match any flavor', () => {
        cloudProfile.value = {
          ...cloudProfile.value,
          spec: {
            machineImages: [
              {
                name: 'gardenlinux',
                versions: [
                  {
                    version: '1.0.0',
                    classification: 'supported',
                    capabilityFlavors: [{ architecture: ['amd64'] }],
                    // No deprecated architectures field
                  },
                ],
              },
            ],
          },
        }

        const { useDefaultMachineImage } = useMachineImages(cloudProfile)
        const machineType = ref({})
        const architecture = ref('arm64')

        const defaultImage = useDefaultMachineImage(machineType, architecture)
        expect(defaultImage.value).toBeUndefined()
      })

      it('should fall back to legacy architectures field when capabilityFlavors is absent', () => {
        cloudProfile.value = {
          ...cloudProfile.value,
          spec: {
            machineImages: [
              {
                name: 'gardenlinux',
                versions: [
                  {
                    version: '1.0.0',
                    classification: 'supported',
                    architectures: ['arm64'],
                    // No capabilityFlavors
                  },
                ],
              },
            ],
          },
        }

        const { useDefaultMachineImage } = useMachineImages(cloudProfile)
        const machineType = ref({})

        // Matching legacy architecture
        const matchingImage = useDefaultMachineImage(machineType, ref('arm64'))
        expect(matchingImage.value).toBeDefined()
        expect(matchingImage.value.name).toBe('gardenlinux')

        // Non-matching legacy architecture
        const noImage = useDefaultMachineImage(machineType, ref('amd64'))
        expect(noImage.value).toBeUndefined()
      })

      it('should match multi-flavor image when one flavor supports the selected architecture', () => {
        cloudProfile.value = {
          ...cloudProfile.value,
          spec: {
            machineImages: [
              {
                name: 'gardenlinux',
                versions: [
                  {
                    version: '1.0.0',
                    classification: 'supported',
                    capabilityFlavors: [
                      { architecture: ['amd64'], hypervisorType: ['gen1'] },
                      { architecture: ['arm64'], hypervisorType: ['gen2'] },
                    ],
                  },
                ],
              },
            ],
          },
        }

        const { useDefaultMachineImage } = useMachineImages(cloudProfile)
        const machineType = ref({})

        const arm64Image = useDefaultMachineImage(machineType, ref('arm64'))
        expect(arm64Image.value).toBeDefined()
        expect(arm64Image.value.name).toBe('gardenlinux')

        const amd64Image = useDefaultMachineImage(machineType, ref('amd64'))
        expect(amd64Image.value).toBeDefined()
        expect(amd64Image.value.name).toBe('gardenlinux')
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

      it('hides machine image vendors using vendor branding', () => {
        configStore.setConfiguration({
          branding: {
            machineImageVendors: [{
              name: 'gardenlinux',
              hidden: true,
            }],
          },
        })

        const { machineImages, useFilteredMachineImages, useDefaultMachineImage } = useMachineImages(cloudProfile)

        expect(machineImages.value).toHaveLength(8)
        expect(find(machineImages.value, { name: 'gardenlinux', version: '1.1.5' })).toBeDefined()

        const filteredImages = useFilteredMachineImages({})
        expect(filteredImages).toHaveLength(3)
        expect(filteredImages.every(({ name }) => name === 'foo')).toBe(true)
        expect(useDefaultMachineImage(ref({})).value.name).toBe('foo')
      })
    })
  })
})
