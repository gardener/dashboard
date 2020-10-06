//
// Copyright (c) 2020 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

import utils from '@/utils'
import map from 'lodash/map'

const { canI, selectedImageIsNotLatest } = utils

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
  describe('#availableK8sUpdatesForShoot', () => {
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

    beforeEach(() => {
      utils.store.getters = {
        kubernetesVersions: () => {
          return kubernetesVersions
        }
      }
    })

    it('should return available K8sUpdates for given version', () => {
      const availableK8sUpdates = utils.availableK8sUpdatesForShoot('1.16.9', 'foo')
      expect(availableK8sUpdates.minor[0]).toBe(kubernetesVersions[1])
      expect(availableK8sUpdates.patch[0]).toBe(kubernetesVersions[4])
      expect(availableK8sUpdates.major[0]).toBe(kubernetesVersions[0])
    })

    it('should differentiate between patch/minor/major available K8sUpdates for given version, filter out expired', () => {
      const availableK8sUpdates = utils.availableK8sUpdatesForShoot('1.16.9', 'foo')
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

    beforeEach(() => {
      utils.store.getters = {
        kubernetesVersions: () => kubernetesVersions
      }
    })

    describe('#k8sVersionIsNotLatestPatch', () => {
      it('selected kubernetes version should be latest (multiple same minor)', () => {
        const result = utils.k8sVersionIsNotLatestPatch(kubernetesVersions[1].version, 'foo')
        expect(result).toBe(false)
      })

      it('selected kubernetes version should be latest (one minor, one major, one preview update available)', () => {
        const result = utils.k8sVersionIsNotLatestPatch(kubernetesVersions[2].version, 'foo')
        expect(result).toBe(false)
      })

      it('selected kubernetes version should not be latest', () => {
        const result = utils.k8sVersionIsNotLatestPatch(kubernetesVersions[0].version, 'foo')
        expect(result).toBe(true)
      })
    })

    describe('#k8sVersionUpdatePathAvailable', () => {
      it('selected kubernetes version should have update path (minor update available)', () => {
        const result = utils.k8sVersionUpdatePathAvailable(kubernetesVersions[3].version, 'foo')
        expect(result).toBe(true)
      })

      it('selected kubernetes version should have update path (patch update available)', () => {
        const result = utils.k8sVersionUpdatePathAvailable(kubernetesVersions[4].version, 'foo')
        expect(result).toBe(true)
      })

      it('selected kubernetes version should not have update path (minor update is preview)', () => {
        const result = utils.k8sVersionUpdatePathAvailable(kubernetesVersions[5].version, 'foo')
        expect(result).toBe(false)
      })

      it('selected kubernetes version should not have update path (no next minor version update available)', () => {
        const result = utils.k8sVersionUpdatePathAvailable(kubernetesVersions[7].version, 'foo')
        expect(result).toBe(false)
      })
    })

    describe('#k8sVersionExpirationForShoot ', () => {
      it('should be info level (patch avialable, auto update enabled))', () => {
        const versionExpirationWarning = utils.k8sVersionExpirationForShoot(kubernetesVersions[0].version, 'foo', true)
        expect(versionExpirationWarning).toEqual({
          expirationDate: kubernetesVersions[0].expirationDate,
          isValidTerminationDate: true,
          isError: false,
          isWarning: false,
          isInfo: true
        })
      })

      it('should be warning level (patch available, auto update disabled))', () => {
        const versionExpirationWarning = utils.k8sVersionExpirationForShoot(kubernetesVersions[0].version, 'foo', false)
        expect(versionExpirationWarning).toEqual({
          expirationDate: kubernetesVersions[0].expirationDate,
          isValidTerminationDate: true,
          isError: false,
          isWarning: true,
          isInfo: false
        })
      })

      it('should be warning level (update available, auto update enabled / disabled))', () => {
        let versionExpirationWarning = utils.k8sVersionExpirationForShoot(kubernetesVersions[1].version, 'foo', true)
        expect(versionExpirationWarning).toEqual({
          expirationDate: kubernetesVersions[1].expirationDate,
          isValidTerminationDate: true,
          isError: false,
          isWarning: true,
          isInfo: false
        })

        versionExpirationWarning = utils.k8sVersionExpirationForShoot(kubernetesVersions[1].version, 'foo', false)
        expect(versionExpirationWarning).toEqual({
          expirationDate: kubernetesVersions[1].expirationDate,
          isValidTerminationDate: true,
          isError: false,
          isWarning: true,
          isInfo: false
        })
      })

      it('should be error level (no update path available))', () => {
        const versionExpirationWarning = utils.k8sVersionExpirationForShoot(kubernetesVersions[7].version, 'foo', false)
        expect(versionExpirationWarning).toEqual({
          expirationDate: kubernetesVersions[7].expirationDate,
          isValidTerminationDate: false,
          isError: true,
          isWarning: false,
          isInfo: false
        })
      })

      it('should be error level (version not expired))', () => {
        const versionExpirationWarning = utils.k8sVersionExpirationForShoot(kubernetesVersions[8].version, 'foo', true)
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
        expirationDate: '2119-04-05T01:02:03Z' // not expired
      },
      {
        name: 'FooImage2',
        vendorName: 'Foo',
        icon: 'icon',
        version: '1.2.2'
      },
      {
        name: 'FooImage3',
        vendorName: 'Foo',
        icon: 'icon',
        version: '1.3.2'
      },
      {
        name: 'FooImage4',
        vendorName: 'Foo',
        icon: 'icon',
        version: '1.3.3',
        isPreview: true,
        expirationDate: '2119-04-05T01:02:03Z' // not expired
      },
      {
        name: 'BarImage',
        vendorName: 'Bar',
        icon: 'icon',
        version: '3.3.2',
        expirationDate: '2019-04-05T01:02:03Z' // expired
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

    beforeEach(() => {
      utils.store.getters = {
        machineImagesByCloudProfileName: () => sampleMachineImages
      }
    })

    describe('#selectedImageIsNotLatest', () => {
      it('selected image should be latest (multiple exist, preview exists)', () => {
        const result = selectedImageIsNotLatest(sampleMachineImages[2], sampleMachineImages)
        expect(result).toBe(false)
      })

      it('selected image should be latest (one exists)', () => {
        const result = selectedImageIsNotLatest(sampleMachineImages[3], sampleMachineImages)
        expect(result).toBe(false)
      })

      it('selected image should not be latest', () => {
        const result = selectedImageIsNotLatest(sampleMachineImages[1], sampleMachineImages)
        expect(result).toBe(true)
      })
    })

    describe('#selectedImageIsNotLatest', () => {
      it('one should be info level (update available, auto update enabled))', () => {
        const workers = generateWorkerGroups([sampleMachineImages[0], sampleMachineImages[1]])
        const expiredWorkerGroups = utils.expiringWorkerGroupsForShoot(workers, 'foo', true)
        expect(expiredWorkerGroups).toBeInstanceOf(Array)
        expect(expiredWorkerGroups).toHaveLength(1)
        expect(expiredWorkerGroups[0]).toEqual({
          ...sampleMachineImages[0],
          workerName: workers[0].name,
          isValidTerminationDate: true,
          isError: false,
          isWarning: false,
          isInfo: true
        })
      })

      it('one should be warning level (update available, auto update disabled))', () => {
        const workers = generateWorkerGroups([sampleMachineImages[0]])
        const expiredWorkerGroups = utils.expiringWorkerGroupsForShoot(workers, 'foo', false)
        expect(expiredWorkerGroups).toBeInstanceOf(Array)
        expect(expiredWorkerGroups).toHaveLength(1)
        expect(expiredWorkerGroups[0]).toEqual({
          ...sampleMachineImages[0],
          workerName: workers[0].name,
          isValidTerminationDate: true,
          isError: false,
          isWarning: true,
          isInfo: false
        })
      })

      it('one should be info level, two error (update available, auto update enabled))', () => {
        const workers = generateWorkerGroups([sampleMachineImages[0], sampleMachineImages[1], sampleMachineImages[3], sampleMachineImages[4]])
        const expiredWorkerGroups = utils.expiringWorkerGroupsForShoot(workers, 'foo', true)
        expect(expiredWorkerGroups).toBeInstanceOf(Array)
        expect(expiredWorkerGroups).toHaveLength(3)
        expect(expiredWorkerGroups[0]).toEqual({
          ...sampleMachineImages[0],
          workerName: workers[0].name,
          isValidTerminationDate: true,
          isError: false,
          isWarning: false,
          isInfo: true
        })
        expect(expiredWorkerGroups[1]).toEqual({
          ...sampleMachineImages[3],
          workerName: workers[2].name,
          isValidTerminationDate: true,
          isError: true,
          isWarning: false,
          isInfo: false,
          isPreview: true
        })
        expect(expiredWorkerGroups[2]).toEqual({
          ...sampleMachineImages[4],
          workerName: workers[3].name,
          isValidTerminationDate: false,
          isError: true,
          isWarning: false,
          isInfo: false
        })
      })

      it('should be empty array (ignore versions without expiration date))', () => {
        const workers = generateWorkerGroups([sampleMachineImages[1], sampleMachineImages[2]])
        const expiredWorkerGroups = utils.expiringWorkerGroupsForShoot(workers, 'foo', true)
        expect(expiredWorkerGroups).toBeInstanceOf(Array)
        expect(expiredWorkerGroups).toHaveLength(0)
      })
    })
  })
})
