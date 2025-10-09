//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { ref } from 'vue'

import { useCloudProfileForKubeVersions } from '@/composables/useCloudProfile/useCloudProfileForKubeVersions'

import find from 'lodash/find'

describe('composables', () => {
  describe('useCloudProfileForKubeVersions', () => {
    const preview22Version = {
      classification: 'preview',
      version: '2.2.0',
    }
    const supported20Version = {
      version: '2.0.0',
      classification: 'supported',
    }
    const deprecated181VersionWithoutExpiration = {
      version: '1.18.1',
      classification: 'deprecated',
    }
    const supported18VersionWithExpirationWarning = {
      version: '1.18.0',
      classification: 'supported',
      expirationDate: '2024-01-15T23:59:59Z',
    }
    const supported17VersionWithExpirationWarning = {
      version: '1.17.0',
      classification: 'supported',
      expirationDate: '2024-01-15T23:59:59Z',
    }
    const preview166Version = {
      version: '1.16.6',
      classification: 'preview',
    }
    const supported165VersionWithExpiration = {
      expirationDate: '2024-04-12T23:59:59Z',
      version: '1.16.5',
      classification: 'supported',
    }
    const unclassified164VersionWithExpiration = {
      expirationDate: '2024-04-12T23:59:59Z',
      version: '1.16.4',
    }
    const deprecatedVersion = {
      version: '1.16.3',
      classification: 'deprecated',
    }
    const supported162VersionWithExpirationWarning = {
      expirationDate: '2024-01-15T23:59:59Z',
      version: '1.16.2',
      classification: 'supported',
    }
    const expiredVersion = {
      expirationDate: '2023-03-15T23:59:59Z',
      version: '1.16.1',
    }
    const deprecatedOldest16Version = {
      version: '1.16.0',
      classification: 'deprecated',
    }
    const deprecated15Version = {
      version: '1.15.0',
      classification: 'deprecated',
      expirationDate: '2024-01-15T23:59:59Z',
    }
    const deprecated14Version = {
      version: '1.14.0',
      classification: 'deprecated',
      expirationDate: '2024-01-15T23:59:59Z',
    }
    const invalidVersion = {
      version: '1.06.2',
    }

    const kubernetesVersions = [
      supported165VersionWithExpiration,
      preview22Version,
      supported20Version,
      supported18VersionWithExpirationWarning,
      deprecated181VersionWithoutExpiration,
      supported17VersionWithExpirationWarning,
      preview166Version,
      unclassified164VersionWithExpiration,
      deprecatedVersion,
      supported162VersionWithExpirationWarning,
      expiredVersion,
      invalidVersion,
      deprecatedOldest16Version,
      deprecated15Version,
      deprecated14Version,
    ]

    let cloudProfile

    beforeAll(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2024-01-01'))
    })

    afterAll(() => {
      vi.useRealTimers()
    })

    beforeEach(() => {
      cloudProfile = ref({
        metadata: {
          name: 'foo',
        },
        kind: 'CloudProfile',
        name: 'foo',
        spec: {
          kubernetes: {
            versions: kubernetesVersions,
          },
        },
      })
    })

    describe('#sortedKubernetesVersions', () => {
      it('should filter and sort kubernetes versions from cloud profile', () => {
        const { sortedKubernetesVersions } = useCloudProfileForKubeVersions(cloudProfile)
        const decoratedAndSortedVersions = sortedKubernetesVersions.value
        expect(decoratedAndSortedVersions).toHaveLength(kubernetesVersions.length - 1)

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
        expect(decoratedSupported165Version).toBe(decoratedAndSortedVersions[6])

        const decoratedVersionWithoutExpiration = find(decoratedAndSortedVersions, deprecated181VersionWithoutExpiration)
        expect(decoratedVersionWithoutExpiration.isExpirationWarning).toBe(false)
        expect(decoratedVersionWithoutExpiration.isExpired).toBe(false)
      })
    })

    describe('#availableKubernetesUpdatesForShoot', () => {
      it('should differentiate between patch/minor/major available K8sUpdates for given version, filter out expired', () => {
        const { availableKubernetesUpdatesForShoot } = useCloudProfileForKubeVersions(cloudProfile)
        const shootVersion = ref(deprecatedOldest16Version.version)
        const availableK8sUpdates = availableKubernetesUpdatesForShoot(shootVersion)
        expect(availableK8sUpdates.value.patch.length).toBe(5)
        expect(availableK8sUpdates.value.minor.length).toBe(3)
        expect(availableK8sUpdates.value.major.length).toBe(2)
      })

      it('should return available K8sUpdates for given version', () => {
        const { availableKubernetesUpdatesForShoot } = useCloudProfileForKubeVersions(cloudProfile)
        const shootVersion = ref(unclassified164VersionWithExpiration.version)
        const availableK8sUpdates = availableKubernetesUpdatesForShoot(shootVersion)
        expect(availableK8sUpdates.value.patch[0]).toEqual(expect.objectContaining(supported165VersionWithExpiration))
        expect(availableK8sUpdates.value.minor[0]).toEqual(expect.objectContaining(supported18VersionWithExpirationWarning))
        expect(availableK8sUpdates.value.major[0]).toEqual(expect.objectContaining(preview22Version))
      })
    })

    describe('#kubernetesVersionIsNotLatestPatch', () => {
      it('selected kubernetes version should be latest (one minor, one major, one preview patch update available)', () => {
        const { kubernetesVersionIsNotLatestPatch } = useCloudProfileForKubeVersions(cloudProfile)
        const kubernetesVersion = ref(supported165VersionWithExpiration.version)
        const result = kubernetesVersionIsNotLatestPatch(kubernetesVersion)
        expect(result.value).toBe(false)
      })

      it('selected kubernetes version should not be latest', () => {
        const { kubernetesVersionIsNotLatestPatch } = useCloudProfileForKubeVersions(cloudProfile)
        const kubernetesVersion = ref(supported162VersionWithExpirationWarning.version)
        const result = kubernetesVersionIsNotLatestPatch(kubernetesVersion)
        expect(result.value).toBe(true)
      })
    })

    describe('#kubernetesVersionUpdatePathAvailable', () => {
      it('selected kubernetes version should have update path (minor update available)', () => {
        const { kubernetesVersionUpdatePathAvailable } = useCloudProfileForKubeVersions(cloudProfile)
        const kubernetesVersion = ref(supported17VersionWithExpirationWarning.version)
        const result = kubernetesVersionUpdatePathAvailable(kubernetesVersion)
        expect(result.value).toBe(true)
      })

      it('selected kubernetes version should have update path (patch update available)', () => {
        const { kubernetesVersionUpdatePathAvailable } = useCloudProfileForKubeVersions(cloudProfile)
        const kubernetesVersion = ref(unclassified164VersionWithExpiration.version)
        const result = kubernetesVersionUpdatePathAvailable(kubernetesVersion)
        expect(result.value).toBe(true)
      })

      it('selected kubernetes version should have update path (no immediate update available)', () => {
        const { kubernetesVersionUpdatePathAvailable } = useCloudProfileForKubeVersions(cloudProfile)
        const kubernetesVersion = ref(deprecated14Version.version)
        const result = kubernetesVersionUpdatePathAvailable(kubernetesVersion)
        expect(result.value).toBe(true)
      })

      it('selected kubernetes version should not have update path (minor update is preview)', () => {
        const { kubernetesVersionUpdatePathAvailable } = useCloudProfileForKubeVersions(cloudProfile)
        const kubernetesVersion = ref(supported20Version.version)
        const result = kubernetesVersionUpdatePathAvailable(kubernetesVersion)
        expect(result.value).toBe(false)
      })

      it('selected kubernetes version should not have update path (no newer version available)', () => {
        const { kubernetesVersionUpdatePathAvailable } = useCloudProfileForKubeVersions(cloudProfile)
        const kubernetesVersion = ref(deprecated181VersionWithoutExpiration.version)
        const result = kubernetesVersionUpdatePathAvailable(kubernetesVersion)
        expect(result.value).toBe(false)
      })
    })

    describe('#kubernetesVersionExpirationForShoot', () => {
      it('should be info level (patch available, auto update enabled))', () => {
        const { kubernetesVersionExpirationForShoot } = useCloudProfileForKubeVersions(cloudProfile)
        const shootK8sVersion = ref(unclassified164VersionWithExpiration.version)
        const k8sAutoPatch = ref(true)
        const versionExpirationWarning = kubernetesVersionExpirationForShoot(shootK8sVersion, k8sAutoPatch)
        expect(versionExpirationWarning.value).toEqual({
          expirationDate: unclassified164VersionWithExpiration.expirationDate,
          isExpired: false,
          isValidTerminationDate: true,
          severity: 'info',
        })
      })

      it('should be warning level (patch available, auto update enabled, expiration warning))', () => {
        const { kubernetesVersionExpirationForShoot } = useCloudProfileForKubeVersions(cloudProfile)
        const shootK8sVersion = ref(supported162VersionWithExpirationWarning.version)
        const k8sAutoPatch = ref(true)
        const versionExpirationWarning = kubernetesVersionExpirationForShoot(shootK8sVersion, k8sAutoPatch)
        expect(versionExpirationWarning.value).toEqual({
          expirationDate: supported162VersionWithExpirationWarning.expirationDate,
          isExpired: false,
          isValidTerminationDate: true,
          severity: 'warning',
        })
      })

      it('should be warning level (patch available, auto update disabled))', () => {
        const { kubernetesVersionExpirationForShoot } = useCloudProfileForKubeVersions(cloudProfile)
        const shootK8sVersion = ref(supported162VersionWithExpirationWarning.version)
        const k8sAutoPatch = ref(false)
        const versionExpirationWarning = kubernetesVersionExpirationForShoot(shootK8sVersion, k8sAutoPatch)
        expect(versionExpirationWarning.value).toEqual({
          expirationDate: supported162VersionWithExpirationWarning.expirationDate,
          isExpired: false,
          isValidTerminationDate: true,
          severity: 'warning',
        })
      })

      it('should be warning level (update available, auto update enabled / disabled))', () => {
        const { kubernetesVersionExpirationForShoot } = useCloudProfileForKubeVersions(cloudProfile)
        const shootK8sVersion = ref(supported17VersionWithExpirationWarning.version)
        let k8sAutoPatch = ref(true)
        let versionExpirationWarning = kubernetesVersionExpirationForShoot(shootK8sVersion, k8sAutoPatch)
        expect(versionExpirationWarning.value).toEqual({
          expirationDate: supported17VersionWithExpirationWarning.expirationDate,
          isExpired: false,
          isValidTerminationDate: true,
          severity: 'warning',
        })

        k8sAutoPatch = ref(false)
        versionExpirationWarning = kubernetesVersionExpirationForShoot(shootK8sVersion, k8sAutoPatch)
        expect(versionExpirationWarning.value).toEqual({
          expirationDate: supported17VersionWithExpirationWarning.expirationDate,
          isExpired: false,
          isValidTerminationDate: true,
          severity: 'warning',
        })
      })

      it('should be error level (only deprecated newer version available))', () => {
        const { kubernetesVersionExpirationForShoot } = useCloudProfileForKubeVersions(cloudProfile)
        const shootK8sVersion = ref(supported18VersionWithExpirationWarning.version)
        const k8sAutoPatch = ref(false)
        const versionExpirationWarning = kubernetesVersionExpirationForShoot(shootK8sVersion, k8sAutoPatch)
        expect(versionExpirationWarning.value).toEqual({
          expirationDate: supported18VersionWithExpirationWarning.expirationDate,
          isExpired: false,
          isValidTerminationDate: true,
          severity: 'error',
        })
      })

      it('should not have warning (version not expired))', () => {
        const { kubernetesVersionExpirationForShoot } = useCloudProfileForKubeVersions(cloudProfile)
        const shootK8sVersion = ref(unclassified164VersionWithExpiration.version)
        const k8sAutoPatch = ref(false)
        const versionExpirationWarning = kubernetesVersionExpirationForShoot(shootK8sVersion, k8sAutoPatch)
        expect(versionExpirationWarning.value).toBeUndefined()
      })

      it('should have info (auto update)', () => {
        const { kubernetesVersionExpirationForShoot } = useCloudProfileForKubeVersions(cloudProfile)
        const shootK8sVersion = ref(unclassified164VersionWithExpiration.version)
        const k8sAutoPatch = ref(true)
        const versionExpirationWarning = kubernetesVersionExpirationForShoot(shootK8sVersion, k8sAutoPatch)
        expect(versionExpirationWarning.value).toEqual({
          expirationDate: unclassified164VersionWithExpiration.expirationDate,
          isExpired: false,
          isValidTerminationDate: true,
          severity: 'info',
        })
      })

      it('should not have warning (deprecated version has no expiration))', () => {
        const { kubernetesVersionExpirationForShoot } = useCloudProfileForKubeVersions(cloudProfile)
        const shootK8sVersion = ref(deprecatedOldest16Version.version)
        const k8sAutoPatch = ref(false)
        const versionExpirationWarning = kubernetesVersionExpirationForShoot(shootK8sVersion, k8sAutoPatch)
        expect(versionExpirationWarning.value).toBeUndefined()
      })

      it('should not have error when no immediate supported minor version update exists', () => {
        const { kubernetesVersionExpirationForShoot } = useCloudProfileForKubeVersions(cloudProfile)
        const shootK8sVersion = ref(deprecated14Version.version)
        const k8sAutoPatch = ref(true)
        const versionExpirationWarning = kubernetesVersionExpirationForShoot(shootK8sVersion, k8sAutoPatch)
        expect(versionExpirationWarning.value).toEqual({
          expirationDate: deprecated14Version.expirationDate,
          isExpired: false,
          isValidTerminationDate: true,
          severity: 'warning',
        })
      })

      it('should have warning when version is expired', () => {
        const { kubernetesVersionExpirationForShoot } = useCloudProfileForKubeVersions(cloudProfile)
        const shootK8sVersion = ref(expiredVersion.version)
        const k8sAutoPatch = ref(false)
        const versionExpirationWarning = kubernetesVersionExpirationForShoot(shootK8sVersion, k8sAutoPatch)
        expect(versionExpirationWarning.value).toEqual({
          expirationDate: expiredVersion.expirationDate,
          isExpired: true,
          isValidTerminationDate: false,
          severity: 'warning',
        })
      })
    })
  })
})
