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

import { expect } from 'chai'
import utils from '@/utils'

const { canI, selectedImageIsNotLatest } = utils

describe('utils', function () {
  describe('authorization', function () {
    describe('#canI', function () {
      let rulesReview

      beforeEach(function () {
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

      it('should validate', function () {
        expect(canI(rulesReview, 'get', 'group1', 'resource1')).to.be.true
        expect(canI(rulesReview, 'get', 'group1', 'resource1', 'anyResourceName')).to.be.true

        expect(canI(rulesReview, 'foo', 'group1', 'resource1')).to.be.false
        expect(canI(rulesReview, 'get', 'foo', 'resource1')).to.be.false
        expect(canI(rulesReview, 'get', 'group1', 'foo')).to.be.false
        expect(canI(rulesReview, 'get', 'group1', 'resource3')).to.be.false
        expect(canI(rulesReview, 'foo', 'bar', 'baz')).to.be.false
      })

      it('should validate for resourceName', function () {
        expect(canI(rulesReview, 'get', 'group2', 'resource2', 'resourceName2')).to.be.true
        expect(canI(rulesReview, 'get', 'group3', 'resource3')).to.be.true
        expect(canI(rulesReview, 'get', 'group3', 'resource3', 'resourceName3')).to.be.true
        expect(canI(rulesReview, 'get', 'group3', 'resource3', 'resourceName4')).to.be.true
        expect(canI(rulesReview, 'get', 'group3', 'resource3', 'anyResourceName')).to.be.true

        expect(canI(rulesReview, 'get', 'group2', 'resource2')).to.be.false
        expect(canI(rulesReview, 'get', 'group2', 'resource2', 'foo')).to.be.false
        expect(canI(rulesReview, 'foo', 'group2', 'resource2', 'resourceName2')).to.be.false
        expect(canI(rulesReview, 'get', 'foo', 'resource2', 'resourceName2')).to.be.false
        expect(canI(rulesReview, 'get', 'group2', 'foo', 'resourceName2')).to.be.false
        expect(canI(rulesReview, 'foo', 'bar', 'baz', 'resourceName2')).to.be.false
      })

      it('should validate with wildcard verb', function () {
        rulesReview = {
          resourceRules: [{
            verbs: ['*'],
            apiGroups: ['group4'],
            resources: ['resource4']
          }]
        }
        expect(canI(rulesReview, 'get', 'group4', 'resource4')).to.be.true
        expect(canI(rulesReview, 'list', 'group4', 'resource4')).to.be.true
        expect(canI(rulesReview, 'foo', 'group4', 'resource4')).to.be.true
        expect(canI(rulesReview, '*', 'group4', 'resource4')).to.be.true
        expect(canI(rulesReview, 'get', 'group4', 'resource4', 'anyResourceName')).to.be.true

        expect(canI(rulesReview, 'get', 'foo', 'resource4')).to.be.false
        expect(canI(rulesReview, 'get', 'group4', 'foo')).to.be.false
      })

      it('should validate with wildcard apiGroup', function () {
        rulesReview = {
          resourceRules: [{
            verbs: ['get'],
            apiGroups: ['*'],
            resources: ['resource4']
          }]
        }
        expect(canI(rulesReview, 'get', 'group4', 'resource4')).to.be.true
        expect(canI(rulesReview, 'get', 'foo', 'resource4')).to.be.true
        expect(canI(rulesReview, 'get', '*', 'resource4')).to.be.true
        expect(canI(rulesReview, 'get', 'group4', 'resource4', 'anyResourceName')).to.be.true

        expect(canI(rulesReview, 'foo', 'group4', 'resource4')).to.be.false
        expect(canI(rulesReview, 'get', 'group4', 'foo')).to.be.false
      })

      it('should validate with wildcard resource', function () {
        rulesReview = {
          resourceRules: [{
            verbs: ['get'],
            apiGroups: ['group4'],
            resources: ['*']
          }]
        }
        expect(canI(rulesReview, 'get', 'group4', 'resource4')).to.be.true
        expect(canI(rulesReview, 'get', 'group4', 'foo')).to.be.true
        expect(canI(rulesReview, 'get', 'group4', '*')).to.be.true
        expect(canI(rulesReview, 'get', 'group4', 'resource4', 'anyResourceName')).to.be.true

        expect(canI(rulesReview, 'foo', 'group4', 'resource4')).to.be.false
        expect(canI(rulesReview, 'get', 'foo', 'resource4')).to.be.false
      })

      it('should validate with wildcard resource name', function () {
        rulesReview = {
          resourceRules: [{
            verbs: ['get'],
            apiGroups: ['group4'],
            resources: ['resource4'],
            resourceName: ['*']
          }]
        }
        expect(canI(rulesReview, 'get', 'group4', 'resource4')).to.be.true
        expect(canI(rulesReview, 'get', 'group4', 'resource4', 'anyResourceName')).to.be.true

        expect(canI(rulesReview, 'foo', 'group4', 'resource4')).to.be.false
        expect(canI(rulesReview, 'get', 'foo', 'resource4')).to.be.false
        expect(canI(rulesReview, 'get', 'group4', 'foo')).to.be.false
      })

      it('should not fail to validate rulesReview', function () {
        expect(canI(undefined, 'get', 'group1', 'resource1')).to.be.false
        expect(canI({}, 'get', 'group1', 'resource1')).to.be.false
        expect(canI({ resourceRules: [] }, 'get', 'group1', 'resource1')).to.be.false
        expect(canI({
          resourceRules: [{
            verbs: [],
            apiGroups: [],
            resources: []
          }]
        }, 'get', 'group1', 'resource1')).to.be.false
      })
    })
  })
  describe('#availableK8sUpdatesForShoot', function () {
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

    it('should return available K8sUpdates for given version', function () {
      const availableK8sUpdates = utils.availableK8sUpdatesForShoot('1.16.9', 'foo')
      expect(availableK8sUpdates.minor[0]).to.equal(kubernetesVersions[1])
      expect(availableK8sUpdates.patch[0]).to.equal(kubernetesVersions[4])
      expect(availableK8sUpdates.major[0]).to.equal(kubernetesVersions[0])
    })

    it('should differentiate between patch/minor/major available K8sUpdates for given version, filter out expired', function () {
      const availableK8sUpdates = utils.availableK8sUpdatesForShoot('1.16.9', 'foo')
      expect(availableK8sUpdates.patch.length).to.equal(1)
      expect(availableK8sUpdates.minor.length).to.equal(2)
      expect(availableK8sUpdates.major.length).to.equal(1)
    })
  })

  describe('k8s update functions', function () {
    const kubernetesVersions = [
      {
        version: '1.1.1'
      },
      {
        version: '1.1.2'
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
        version: '1.5.0'
      },
      {
        version: '3.3.2'
      }
    ]

    beforeEach(() => {
      utils.store.getters = {
        kubernetesVersions: () => {
          return kubernetesVersions
        }
      }
    })

    it('#k8sVersionIsNotLatestPatch - selected kubernetes version should be latest (multiple same minor)', function () {
      const result = utils.k8sVersionIsNotLatestPatch(kubernetesVersions[1].version, 'foo')
      expect(result).to.be.false
    })

    it('#k8sVersionIsNotLatestPatch - selected kubernetes version should be latest (one minor, one major, one preview update available)', function () {
      const result = utils.k8sVersionIsNotLatestPatch(kubernetesVersions[2].version, 'foo')
      expect(result).to.be.false
    })

    it('#k8sVersionIsNotLatestPatch - selected kubernetes version should not be latest', function () {
      const result = utils.k8sVersionIsNotLatestPatch(kubernetesVersions[0].version, 'foo')
      expect(result).to.be.true
    })

    it('#k8sVersionUpdatePathAvailable - selected kubernetes version should have update path (minor update available)', function () {
      const result = utils.k8sVersionUpdatePathAvailable(kubernetesVersions[3].version, 'foo')
      expect(result).to.be.true
    })

    it('#k8sVersionUpdatePathAvailable - selected kubernetes version should have update path (patch update available)', function () {
      const result = utils.k8sVersionUpdatePathAvailable(kubernetesVersions[4].version, 'foo')
      expect(result).to.be.true
    })

    it('#k8sVersionUpdatePathAvailable - selected kubernetes version should not have update path (minor update is preview)', function () {
      const result = utils.k8sVersionUpdatePathAvailable(kubernetesVersions[5].version, 'foo')
      expect(result).to.be.false
    })

    it('#k8sVersionUpdatePathAvailable - selected kubernetes version should not have update path (no next minor version update available)', function () {
      const result = utils.k8sVersionUpdatePathAvailable(kubernetesVersions[7].version, 'foo')
      expect(result).to.be.false
    })
  })

  describe('machine image update function', function () {
    const sampleMachineImages = [
      {
        name: 'FooImage',
        vendorName: 'Foo',
        icon: 'icon',
        version: '1.1.1'
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
        isPreview: true
      },
      {
        name: 'BarImage',
        vendorName: 'Bar',
        icon: 'icon',
        version: '3.3.2'
      }
    ]

    it('#selectedImageIsNotLatest - selected image should be latest (multiple exist, preview exists)', function () {
      const result = selectedImageIsNotLatest(sampleMachineImages[2], sampleMachineImages)
      expect(result).to.be.false
    })

    it('#selectedImageIsNotLatest - selected image should be latest (one exists)', function () {
      const result = selectedImageIsNotLatest(sampleMachineImages[3], sampleMachineImages)
      expect(result).to.be.false
    })

    it('#selectedImageIsNotLatest - selected image should not be latest', function () {
      const result = selectedImageIsNotLatest(sampleMachineImages[1], sampleMachineImages)
      expect(result).to.be.true
    })
  })
})
