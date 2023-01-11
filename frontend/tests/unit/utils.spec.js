//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import map from 'lodash/map'

import { getters } from '@/store'
import {
  canI,
  selectedImageIsNotLatest,
  isHtmlColorCode,
  sizeStringToBytes,
  defaultCriNameByKubernetesVersion
} from '@/utils'

describe('utils', () => {
  describe('authorization', () => {
    describe('#canI', () => {
      let rulesReview

      beforeEach(() => {
        rulesReview = {
          resourceRules: [{
            verbs: ['get'],
            apiGroups: ['group1'],
            resources: ['resource1']
          },
          {
            verbs: ['get'],
            apiGroups: ['group2'],
            resources: ['resource2'],
            resourceNames: [
              'resourceName2'
            ]
          },
          {
            verbs: ['get'],
            apiGroups: ['group3'],
            resources: ['resource3']
          },
          {
            verbs: ['get'],
            apiGroups: ['group3'],
            resources: ['resource3'],
            resourceNames: [
              'resourceName3',
              'resourceName4'
            ]
          }]
        }
      })

      it('should validate', () => {
        expect(canI(rulesReview, 'get', 'group1', 'resource1')).toBe(true)
        expect(canI(rulesReview, 'get', 'group1', 'resource1', 'anyResourceName')).toBe(true)

        expect(canI(rulesReview, 'foo', 'group1', 'resource1')).toBe(false)
        expect(canI(rulesReview, 'get', 'foo', 'resource1')).toBe(false)
        expect(canI(rulesReview, 'get', 'group1', 'foo')).toBe(false)
        expect(canI(rulesReview, 'get', 'group1', 'resource3')).toBe(false)
        expect(canI(rulesReview, 'foo', 'bar', 'baz')).toBe(false)
      })

      it('should validate for resourceName', () => {
        expect(canI(rulesReview, 'get', 'group2', 'resource2', 'resourceName2')).toBe(true)
        expect(canI(rulesReview, 'get', 'group3', 'resource3')).toBe(true)
        expect(canI(rulesReview, 'get', 'group3', 'resource3', 'resourceName3')).toBe(true)
        expect(canI(rulesReview, 'get', 'group3', 'resource3', 'resourceName4')).toBe(true)
        expect(canI(rulesReview, 'get', 'group3', 'resource3', 'anyResourceName')).toBe(true)

        expect(canI(rulesReview, 'get', 'group2', 'resource2')).toBe(false)
        expect(canI(rulesReview, 'get', 'group2', 'resource2', 'foo')).toBe(false)
        expect(canI(rulesReview, 'foo', 'group2', 'resource2', 'resourceName2')).toBe(false)
        expect(canI(rulesReview, 'get', 'foo', 'resource2', 'resourceName2')).toBe(false)
        expect(canI(rulesReview, 'get', 'group2', 'foo', 'resourceName2')).toBe(false)
        expect(canI(rulesReview, 'foo', 'bar', 'baz', 'resourceName2')).toBe(false)
      })

      it('should validate with wildcard verb', () => {
        rulesReview = {
          resourceRules: [{
            verbs: ['*'],
            apiGroups: ['group4'],
            resources: ['resource4']
          }]
        }
        expect(canI(rulesReview, 'get', 'group4', 'resource4')).toBe(true)
        expect(canI(rulesReview, 'list', 'group4', 'resource4')).toBe(true)
        expect(canI(rulesReview, 'foo', 'group4', 'resource4')).toBe(true)
        expect(canI(rulesReview, '*', 'group4', 'resource4')).toBe(true)
        expect(canI(rulesReview, 'get', 'group4', 'resource4', 'anyResourceName')).toBe(true)

        expect(canI(rulesReview, 'get', 'foo', 'resource4')).toBe(false)
        expect(canI(rulesReview, 'get', 'group4', 'foo')).toBe(false)
      })

      it('should validate with wildcard apiGroup', () => {
        rulesReview = {
          resourceRules: [{
            verbs: ['get'],
            apiGroups: ['*'],
            resources: ['resource4']
          }]
        }
        expect(canI(rulesReview, 'get', 'group4', 'resource4')).toBe(true)
        expect(canI(rulesReview, 'get', 'foo', 'resource4')).toBe(true)
        expect(canI(rulesReview, 'get', '*', 'resource4')).toBe(true)
        expect(canI(rulesReview, 'get', 'group4', 'resource4', 'anyResourceName')).toBe(true)

        expect(canI(rulesReview, 'foo', 'group4', 'resource4')).toBe(false)
        expect(canI(rulesReview, 'get', 'group4', 'foo')).toBe(false)
      })

      it('should validate with wildcard resource', () => {
        rulesReview = {
          resourceRules: [{
            verbs: ['get'],
            apiGroups: ['group4'],
            resources: ['*']
          }]
        }
        expect(canI(rulesReview, 'get', 'group4', 'resource4')).toBe(true)
        expect(canI(rulesReview, 'get', 'group4', 'foo')).toBe(true)
        expect(canI(rulesReview, 'get', 'group4', '*')).toBe(true)
        expect(canI(rulesReview, 'get', 'group4', 'resource4', 'anyResourceName')).toBe(true)

        expect(canI(rulesReview, 'foo', 'group4', 'resource4')).toBe(false)
        expect(canI(rulesReview, 'get', 'foo', 'resource4')).toBe(false)
      })

      it('should validate with wildcard resource name', () => {
        rulesReview = {
          resourceRules: [{
            verbs: ['get'],
            apiGroups: ['group4'],
            resources: ['resource4'],
            resourceName: ['*']
          }]
        }
        expect(canI(rulesReview, 'get', 'group4', 'resource4')).toBe(true)
        expect(canI(rulesReview, 'get', 'group4', 'resource4', 'anyResourceName')).toBe(true)

        expect(canI(rulesReview, 'foo', 'group4', 'resource4')).toBe(false)
        expect(canI(rulesReview, 'get', 'foo', 'resource4')).toBe(false)
        expect(canI(rulesReview, 'get', 'group4', 'foo')).toBe(false)
      })

      it('should not fail to validate rulesReview', () => {
        expect(canI(undefined, 'get', 'group1', 'resource1')).toBe(false)
        expect(canI({}, 'get', 'group1', 'resource1')).toBe(false)
        expect(canI({ resourceRules: [] }, 'get', 'group1', 'resource1')).toBe(false)
        expect(canI({
          resourceRules: [{
            verbs: [],
            apiGroups: [],
            resources: []
          }]
        }, 'get', 'group1', 'resource1')).toBe(false)
      })
    })
  })
  describe('#availableKubernetesUpdatesForShoot', () => {
    const kubernetesVersions = [
      {
        classification: 'preview',
        version: '2.0.0'
      },
      {
        classification: 'supported',
        version: '1.18.3'
      },
      {
        expirationDate: '2020-01-31T23:59:59Z', // expired
        isExpired: true, // need to set this manually, as version getter is mocked
        version: '1.18.2'
      },
      {
        classification: 'supported',
        version: '1.17.7'
      },
      {
        classification: 'supported',
        version: '1.16.10'
      },
      {
        classification: 'deprecated',
        expirationDate: '2120-08-31T23:59:59Z',
        version: '1.16.9'
      },
      {
        version: '1.15.0'
      }
    ]

    let availableKubernetesUpdatesForShoot
    beforeEach(() => {
      availableKubernetesUpdatesForShoot = getters.availableKubernetesUpdatesForShoot(null, {
        kubernetesVersions: () => kubernetesVersions
      })
    })

    it('should return available K8sUpdates for given version', () => {
      const availableK8sUpdates = availableKubernetesUpdatesForShoot('1.16.9', 'foo')
      expect(availableK8sUpdates.minor[0]).toBe(kubernetesVersions[1])
      expect(availableK8sUpdates.patch[0]).toBe(kubernetesVersions[4])
      expect(availableK8sUpdates.major[0]).toBe(kubernetesVersions[0])
    })

    it('should differentiate between patch/minor/major available K8sUpdates for given version, filter out expired', () => {
      const availableK8sUpdates = availableKubernetesUpdatesForShoot('1.16.9', 'foo')
      expect(availableK8sUpdates.patch.length).toBe(1)
      expect(availableK8sUpdates.minor.length).toBe(2)
      expect(availableK8sUpdates.major.length).toBe(1)
    })
  })

  describe('k8s update functions', () => {
    const kubernetesVersions = [
      {
        version: '1.1.1',
        expirationDate: '2119-04-05T01:02:03Z' // not expired
      },
      {
        version: '1.1.2',
        expirationDate: '2119-04-05T01:02:03Z' // not expired
      },
      {
        version: '1.2.4'
      },
      {
        version: '1.2.5',
        isPreview: true // need to set this manually, as version getter is mocked
      },
      {
        version: '1.3.4'
      },
      {
        version: '1.3.5'
      },
      {
        version: '1.4.0',
        isPreview: true // need to set this manually, as version getter is mocked
      },
      {
        version: '1.5.0',
        expirationDate: '2019-04-05T01:02:03Z' // expired
      },
      {
        version: '3.3.2'
      }
    ]

    let kubernetesVersionIsNotLatestPatch
    let kubernetesVersionUpdatePathAvailable
    let kubernetesVersionExpirationForShoot
    beforeEach(() => {
      kubernetesVersionIsNotLatestPatch = getters.kubernetesVersionIsNotLatestPatch(null, {
        kubernetesVersions: () => kubernetesVersions
      })
      kubernetesVersionUpdatePathAvailable = getters.kubernetesVersionUpdatePathAvailable(null, {
        kubernetesVersions: () => kubernetesVersions,
        kubernetesVersionIsNotLatestPatch
      })
      kubernetesVersionExpirationForShoot = getters.kubernetesVersionExpirationForShoot(null, {
        kubernetesVersions: () => kubernetesVersions,
        kubernetesVersionIsNotLatestPatch,
        kubernetesVersionUpdatePathAvailable
      })
    })

    describe('#kubernetesVersionIsNotLatestPatch', () => {
      it('selected kubernetes version should be latest (multiple same minor)', () => {
        const result = kubernetesVersionIsNotLatestPatch(kubernetesVersions[1].version, 'foo')
        expect(result).toBe(false)
      })

      it('selected kubernetes version should be latest (one minor, one major, one preview update available)', () => {
        const result = kubernetesVersionIsNotLatestPatch(kubernetesVersions[2].version, 'foo')
        expect(result).toBe(false)
      })

      it('selected kubernetes version should not be latest', () => {
        const result = kubernetesVersionIsNotLatestPatch(kubernetesVersions[0].version, 'foo')
        expect(result).toBe(true)
      })
    })

    describe('#k8sVersionUpdatePathAvailable', () => {
      it('selected kubernetes version should have update path (minor update available)', () => {
        const result = kubernetesVersionUpdatePathAvailable(kubernetesVersions[3].version, 'foo')
        expect(result).toBe(true)
      })

      it('selected kubernetes version should have update path (patch update available)', () => {
        const result = kubernetesVersionUpdatePathAvailable(kubernetesVersions[4].version, 'foo')
        expect(result).toBe(true)
      })

      it('selected kubernetes version should not have update path (minor update is preview)', () => {
        const result = kubernetesVersionUpdatePathAvailable(kubernetesVersions[5].version, 'foo')
        expect(result).toBe(false)
      })

      it('selected kubernetes version should not have update path (no next minor version update available)', () => {
        const result = kubernetesVersionUpdatePathAvailable(kubernetesVersions[7].version, 'foo')
        expect(result).toBe(false)
      })
    })

    describe('#k8sVersionExpirationForShoot ', () => {
      it('should be info level (patch avialable, auto update enabled))', () => {
        const versionExpirationWarning = kubernetesVersionExpirationForShoot(kubernetesVersions[0].version, 'foo', true)
        expect(versionExpirationWarning).toEqual({
          expirationDate: kubernetesVersions[0].expirationDate,
          isValidTerminationDate: true,
          severity: 'info'
        })
      })

      it('should be warning level (patch available, auto update disabled))', () => {
        const versionExpirationWarning = kubernetesVersionExpirationForShoot(kubernetesVersions[0].version, 'foo', false)
        expect(versionExpirationWarning).toEqual({
          expirationDate: kubernetesVersions[0].expirationDate,
          isValidTerminationDate: true,
          severity: 'warning'
        })
      })

      it('should be warning level (update available, auto update enabled / disabled))', () => {
        let versionExpirationWarning = kubernetesVersionExpirationForShoot(kubernetesVersions[1].version, 'foo', true)
        expect(versionExpirationWarning).toEqual({
          expirationDate: kubernetesVersions[1].expirationDate,
          isValidTerminationDate: true,
          severity: 'warning'
        })

        versionExpirationWarning = kubernetesVersionExpirationForShoot(kubernetesVersions[1].version, 'foo', false)
        expect(versionExpirationWarning).toEqual({
          expirationDate: kubernetesVersions[1].expirationDate,
          isValidTerminationDate: true,
          severity: 'warning'
        })
      })

      it('should be error level (no update path available))', () => {
        const versionExpirationWarning = kubernetesVersionExpirationForShoot(kubernetesVersions[7].version, 'foo', false)
        expect(versionExpirationWarning).toEqual({
          expirationDate: kubernetesVersions[7].expirationDate,
          isValidTerminationDate: false,
          severity: 'error'
        })
      })

      it('should be error level (version not expired))', () => {
        const versionExpirationWarning = kubernetesVersionExpirationForShoot(kubernetesVersions[8].version, 'foo', true)
        expect(versionExpirationWarning).toBeUndefined()
      })
    })
  })

  describe('machine image update functions', () => {
    const sampleMachineImages = [
      {
        name: 'FooImage',
        vendorName: 'Foo',
        icon: 'icon',
        version: '1.1.1',
        expirationDate: '2119-04-05T01:02:03Z', // not expired
        isSupported: true
      },
      {
        name: 'FooImage2',
        vendorName: 'Foo',
        icon: 'icon',
        version: '1.2.2',
        isSupported: true
      },
      {
        name: 'FooImage3',
        vendorName: 'Foo',
        icon: 'icon',
        version: '1.3.2',
        isSupported: true
      },
      {
        name: 'FooImage4',
        vendorName: 'Foo',
        icon: 'icon',
        version: '1.3.3',
        expirationDate: '2119-04-05T01:02:03Z', // not expired
        isPreview: true
      },
      {
        name: 'BarImage',
        vendorName: 'Bar',
        icon: 'icon',
        version: '3.3.2',
        isSupported: true,
        expirationDate: '2019-04-05T01:02:03Z' // expired
      },
      {
        name: 'FooImage5',
        vendorName: 'Foo',
        icon: 'icon',
        version: '1.3.4',
        isDeprecated: true
      },
      {
        name: 'FooImage6',
        vendorName: 'Foo',
        icon: 'icon',
        version: '1.4.4',
        isPreview: true
      }
    ]

    function generateWorkerGroups (machineImages) {
      return map(machineImages, ({ name, version }) => {
        return {
          name: 'fooworker',
          machine: {
            type: 'footype',
            image: {
              name,
              version
            }
          }
        }
      })
    }

    let expiringWorkerGroupsForShoot
    beforeEach(() => {
      expiringWorkerGroupsForShoot = getters.expiringWorkerGroupsForShoot(null, {
        machineImagesByCloudProfileName: () => sampleMachineImages
      })
    })

    describe('#selectedImageIsNotLatest', () => {
      it('selected image should not be be latest (one newer supported exists)', () => {
        const result = selectedImageIsNotLatest(sampleMachineImages[1], sampleMachineImages)
        expect(result).toBe(true)
      })

      it('selected image should be latest (only newer deprecated, preview and other vendor exists)', () => {
        const result = selectedImageIsNotLatest(sampleMachineImages[2], sampleMachineImages)
        expect(result).toBe(false)
      })

      it('selected image should be latest (only one exists)', () => {
        const result = selectedImageIsNotLatest(sampleMachineImages[4], sampleMachineImages)
        expect(result).toBe(false)
      })
    })

    describe('#expiringWorkerGroupsForShoot', () => {
      it('one should be info level (update available, auto update enabled))', () => {
        const workers = generateWorkerGroups([sampleMachineImages[0], sampleMachineImages[1]])
        const expiredWorkerGroups = expiringWorkerGroupsForShoot(workers, 'foo', true)
        expect(expiredWorkerGroups).toBeInstanceOf(Array)
        expect(expiredWorkerGroups).toHaveLength(1)
        expect(expiredWorkerGroups[0]).toEqual({
          ...sampleMachineImages[0],
          workerName: workers[0].name,
          isValidTerminationDate: true,
          severity: 'info'
        })
      })

      it('one should be warning level (update available, auto update disabled))', () => {
        const workers = generateWorkerGroups([sampleMachineImages[0]])
        const expiredWorkerGroups = expiringWorkerGroupsForShoot(workers, 'foo', false)
        expect(expiredWorkerGroups).toBeInstanceOf(Array)
        expect(expiredWorkerGroups).toHaveLength(1)
        expect(expiredWorkerGroups[0]).toEqual({
          ...sampleMachineImages[0],
          workerName: workers[0].name,
          isValidTerminationDate: true,
          severity: 'warning'
        })
      })

      it('one should be info level, two error (update available, auto update enabled))', () => {
        const workers = generateWorkerGroups([sampleMachineImages[0], sampleMachineImages[1], sampleMachineImages[3], sampleMachineImages[4]])
        const expiredWorkerGroups = expiringWorkerGroupsForShoot(workers, 'foo', true)
        expect(expiredWorkerGroups).toBeInstanceOf(Array)
        expect(expiredWorkerGroups).toHaveLength(3)
        expect(expiredWorkerGroups[0]).toEqual({
          ...sampleMachineImages[0],
          workerName: workers[0].name,
          isValidTerminationDate: true,
          severity: 'info'
        })
        expect(expiredWorkerGroups[1]).toEqual({
          ...sampleMachineImages[3],
          workerName: workers[2].name,
          isValidTerminationDate: true,
          severity: 'error'
        })
        expect(expiredWorkerGroups[2]).toEqual({
          ...sampleMachineImages[4],
          workerName: workers[3].name,
          isValidTerminationDate: false,
          severity: 'error'
        })
      })

      it('should be empty array (ignore versions without expiration date))', () => {
        const workers = generateWorkerGroups([sampleMachineImages[1], sampleMachineImages[2]])
        const expiredWorkerGroups = expiringWorkerGroupsForShoot(workers, 'foo', true)
        expect(expiredWorkerGroups).toBeInstanceOf(Array)
        expect(expiredWorkerGroups).toHaveLength(0)
      })
    })

    describe('defaultCriNameByKubernetesVersion', () => {
      it('should return docker for k8s < 1.22.0', () => {
        expect(defaultCriNameByKubernetesVersion(['cri1', 'docker', 'containerd', 'cri2'], '1.21.3')).toBe('docker')
      })

      it('should return containerd for k8s >= 1.22.0', () => {
        expect(defaultCriNameByKubernetesVersion(['cri1', 'docker', 'containerd', 'cri2'], '1.22.0')).toBe('containerd')
      })

      it('should return first cri as fallback', () => {
        expect(defaultCriNameByKubernetesVersion(['cri1', 'cri2'], '1.21.3')).toBe('cri1')
        expect(defaultCriNameByKubernetesVersion(['cri1', 'cri2'], '1.22.0')).toBe('cri1')
      })
    })
  })
  describe('html color code', () => {
    it('should not fail when zero', () => {
      expect(isHtmlColorCode(undefined)).toBe(false)
      expect(isHtmlColorCode(null)).toBe(false)
    })

    it('should return true on html color code', () => {
      expect(isHtmlColorCode('#0b8062')).toBe(true)
      expect(isHtmlColorCode('#FfFfFf')).toBe(true)
    })

    it('should return false on non-html color code', () => {
      expect(isHtmlColorCode('foo')).toBe(false)
    })
  })

  describe('string to bytes', () => {
    it('should not convert without unit', () => {
      expect(sizeStringToBytes('5000')).toBe(5000)
    })

    it('should not convert with unknown unit', () => {
      expect(sizeStringToBytes('5000a')).toBe('5000a')
    })

    it('should convert with m unit (increase)', () => {
      expect(sizeStringToBytes('5000m')).toBe(5)
    })

    it('should convert with G unit (increase)', () => {
      expect(sizeStringToBytes('5G')).toBe(5368709120)
    })

    it('should convert with Gi unit (increase)', () => {
      expect(sizeStringToBytes('5Gi')).toBe(5000000000)
    })

    it('should convert with exponent', () => {
      expect(sizeStringToBytes('5e3G')).toBe(5368709120000)
    })
  })
})
