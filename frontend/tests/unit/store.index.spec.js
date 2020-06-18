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
import { getters, firstItemMatchingVersionClassification } from '@/store'
import find from 'lodash/find'
import noop from 'lodash/noop'

global.console.error = noop // do not log (expected) errors in tests

describe('Store', function () {
  it('should transform machine images from cloud profile', function () {
    const cpMachineImages = [
      {
        name: 'garden-linux',
        versions: [
          {
            version: '2135.6.0'
          }
        ]
      },
      {
        name: 'suse-chost',
        versions: [
          {
            version: '15.1.20190927'
          },
          {
            version: '15.1.20191027',
            expirationDate: '2119-04-05T01:02:03Z', // not expired
            classification: 'supported'
          },
          {
            version: '15.1.20191127',
            expirationDate: '2019-04-05T01:02:03Z' // expired
          }
        ]
      },
      {
        name: 'foo',
        versions: [
          {
            version: '1.02.3' // invalid version (not semver compatible)
          },
          {
            version: '1.2.3'
          }
        ]
      }
    ]

    const storeGetters = {
      cloudProfileByName (cloudProfileName) {
        expect(cloudProfileName).to.equal('foo')
        return {
          data: {
            machineImages: cpMachineImages
          }
        }
      }
    }

    const dashboardMachineImages = getters.machineImagesByCloudProfileName({}, storeGetters)('foo')
    expect(dashboardMachineImages).to.have.length(4)

    const expiredImage = find(dashboardMachineImages, { name: 'suse-chost', version: '15.1.20191127' })
    expect(expiredImage).to.equal(undefined)

    const invalidImage = find(dashboardMachineImages, { name: 'foo', version: '1.02.3' })
    expect(invalidImage).to.equal(undefined)

    const suseImage = find(dashboardMachineImages, { name: 'suse-chost', version: '15.1.20191027' })
    expect(suseImage.expirationDate).to.equal('2119-04-05T01:02:03Z')
    expect(suseImage.expirationDateString).to.not.equal(undefined)
    expect(suseImage.vendorName).to.equal('suse-chost')
    expect(suseImage.icon).to.equal('suse-chost')
    expect(suseImage.needsLicense).to.equal(true)
    expect(suseImage.classification).to.equal('supported')
    expect(suseImage.isSupported).to.equal(true)
    expect(suseImage.isDeprecated).to.equal(false)
    expect(suseImage.isPreview).to.equal(false)
    expect(suseImage).to.equal(dashboardMachineImages[1]) // check sorting

    const fooImage = find(dashboardMachineImages, { name: 'foo', version: '1.2.3' })
    expect(fooImage.needsLicense).to.equal(false)
    expect(fooImage.isSupported).to.equal(false)
  })

  it('should filter kubernetes versions from cloud profile', function () {
    const kubernetesVersions = [
      {
        version: '1.13.4'
      },
      {
        expirationDate: '2120-04-12T23:59:59Z', // not expired
        version: '1.16.3',
        classification: 'supported'
      },
      {
        expirationDate: '2019-03-15T23:59:59Z', // expired
        version: '1.16.2'
      },
      {
        version: '1.06.2' // invalid version (not semver compatible)
      }
    ]

    const storeGetters = {
      cloudProfileByName (cloudProfileName) {
        expect(cloudProfileName).to.equal('foo')
        return {
          data: {
            kubernetes: {
              versions: kubernetesVersions
            }
          }
        }
      },
      kubernetesVersions (cloudProfileName) {
        expect(cloudProfileName).to.equal('foo')
        return getters.kubernetesVersions({}, this)(cloudProfileName)
      }
    }

    const dashboardVersions = getters.sortedKubernetesVersions({}, storeGetters)('foo')
    expect(dashboardVersions).to.have.length(2)

    const expiredVersion = find(dashboardVersions, { version: '1.16.2' })
    expect(expiredVersion).to.equal(undefined)

    const invalidVersion = find(dashboardVersions, { version: '1.06.2' })
    expect(invalidVersion).to.equal(undefined)

    const kubernetesVersion = find(dashboardVersions, { version: '1.16.3' })
    expect(kubernetesVersion.expirationDate).to.equal('2120-04-12T23:59:59Z')
    expect(kubernetesVersion.expirationDateString).to.not.equal(undefined)
    expect(kubernetesVersion.classification).to.equal('supported')
    expect(kubernetesVersion).to.equal(dashboardVersions[0]) // check sorting
  })

  it('should return machineTypes by region and zones from cloud profile', function () {
    const cpMachineTypes = [
      {
        name: 'machineType1'
      },
      {
        name: 'machineType2'
      },
      {
        name: 'machineType3'
      }
    ]

    const storeGetters = {
      cloudProfileByName (cloudProfileName) {
        expect(cloudProfileName).to.equal('foo')
        return {
          data: {
            machineTypes: cpMachineTypes,
            regions: [
              {
                name: 'region1',
                zones: [
                  {
                    name: 'zone1'
                  },
                  {
                    name: 'zone2',
                    unavailableMachineTypes: [
                      'machineType2'
                    ]
                  }
                ]
              },
              {
                name: 'region2',
                zones: [
                  {
                    name: 'zone1'
                  }
                ]
              }
            ]
          }
        }
      },
      machineTypesByCloudProfileNameAndRegionAndZones (...args) {
        return getters.machineTypesByCloudProfileNameAndRegionAndZones({}, this)(...args)
      },
      machineTypesOrVolumeTypesByCloudProfileNameAndRegionAndZones (...args) {
        return getters.machineTypesOrVolumeTypesByCloudProfileNameAndRegionAndZones({}, this)(...args)
      }
    }

    let dashboardMachineTypes = getters.machineTypesByCloudProfileName({}, storeGetters)({ cloudProfileName: 'foo' })
    expect(dashboardMachineTypes).to.have.length(3)

    dashboardMachineTypes = getters.machineTypesByCloudProfileNameAndRegionAndZones({}, storeGetters)({ cloudProfileName: 'foo', region: 'region1', zones: ['zone2'] })
    expect(dashboardMachineTypes).to.have.length(2)
    expect(dashboardMachineTypes[0].name).to.equal('machineType1')
    expect(dashboardMachineTypes[1].name).to.equal('machineType3')

    dashboardMachineTypes = getters.machineTypesByCloudProfileNameAndRegionAndZones({}, storeGetters)({ cloudProfileName: 'foo', region: 'region1', zones: ['zone1', 'zone3'] })
    expect(dashboardMachineTypes).to.have.length(3)

    dashboardMachineTypes = getters.machineTypesByCloudProfileNameAndRegionAndZones({}, storeGetters)({ cloudProfileName: 'foo', region: 'region2', zones: ['zone1'] })
    expect(dashboardMachineTypes).to.have.length(3)
  })

  it('should return volumeTypes by region and zones from cloud profile', function () {
    const cpVolumeTypes = [
      {
        name: 'volumeType1'
      },
      {
        name: 'volumeType2'
      },
      {
        name: 'volumeType3'
      }
    ]

    const storeGetters = {
      cloudProfileByName (cloudProfileName) {
        expect(cloudProfileName).to.equal('foo')
        return {
          data: {
            volumeTypes: cpVolumeTypes,
            regions: [
              {
                name: 'region1',
                zones: [
                  {
                    name: 'zone1'
                  },
                  {
                    name: 'zone2',
                    unavailableVolumeTypes: [
                      'volumeType2'
                    ]
                  },
                  {
                    name: 'zone3',
                    unavailableVolumeTypes: [
                      'volumeType1',
                      'volumeType3'
                    ]
                  }
                ]
              },
              {
                name: 'region2',
                zones: [
                  {
                    name: 'zone1'
                  }
                ]
              }
            ]
          }
        }
      },
      volumeTypesByCloudProfileNameAndRegionAndZones (...args) {
        return getters.volumeTypesByCloudProfileNameAndRegionAndZones({}, this)(...args)
      },
      machineTypesOrVolumeTypesByCloudProfileNameAndRegionAndZones (...args) {
        return getters.machineTypesOrVolumeTypesByCloudProfileNameAndRegionAndZones({}, this)(...args)
      }
    }

    let dashboardVolumeTypes = getters.volumeTypesByCloudProfileName({}, storeGetters)({ cloudProfileName: 'foo' })
    expect(dashboardVolumeTypes).to.have.length(3)

    dashboardVolumeTypes = getters.volumeTypesByCloudProfileNameAndRegionAndZones({}, storeGetters)({ cloudProfileName: 'foo', region: 'region1', zones: ['zone1'] })
    expect(dashboardVolumeTypes).to.have.length(3)

    dashboardVolumeTypes = getters.volumeTypesByCloudProfileNameAndRegionAndZones({}, storeGetters)({ cloudProfileName: 'foo', region: 'region1', zones: ['zone2', 'zone3'] })
    expect(dashboardVolumeTypes).to.have.length(0)

    dashboardVolumeTypes = getters.volumeTypesByCloudProfileNameAndRegionAndZones({}, storeGetters)({ cloudProfileName: 'foo', region: 'region1', zones: ['zone3'] })
    expect(dashboardVolumeTypes).to.have.length(1)
    expect(dashboardVolumeTypes[0].name).to.equal('volumeType2')

    dashboardVolumeTypes = getters.volumeTypesByCloudProfileNameAndRegionAndZones({}, storeGetters)({ cloudProfileName: 'foo', region: 'region2', zones: ['zone1'] })
    expect(dashboardVolumeTypes).to.have.length(3)
  })

  it('should return an empty machineType / volumeType array if no cloud profile is provided', function () {
    const items = getters.machineTypesOrVolumeTypesByCloudProfileNameAndRegionAndZones({}, getters)({ })
    expect(items).to.be.an.instanceof(Array)
    expect(items).to.have.length(0)
  })

  it('should return floating pool names by region and domain from cloud profile', function () {
    const cpFloatingPools = [
      {
        name: 'global FP'
      },
      {
        name: 'regional FP',
        region: 'region1'
      },
      {
        name: 'regional non constraining FP',
        region: 'region2',
        nonConstraining: true
      },
      {
        name: 'domain specific FP',
        domain: 'domain1'
      },
      {
        name: 'domain specific non constraining FP',
        domain: 'domain2',
        nonConstraining: true
      },
      {
        name: 'domain specific, regional FP',
        domain: 'domain3',
        region: 'region3'
      },
      {
        name: 'additional domain specific, regional FP',
        domain: 'domain3',
        region: 'region3'
      },
      {
        name: 'domain specific, regional non constraining FP',
        domain: 'domain4',
        region: 'region4',
        nonConstraining: true
      }
    ]

    const storeGetters = {
      cloudProfileByName (cloudProfileName) {
        expect(cloudProfileName).to.equal('foo')
        return {
          data: {
            providerConfig: {
              constraints: {
                floatingPools: cpFloatingPools
              }
            }
          }
        }
      },
      floatingPoolNamesByCloudProfileNameAndRegionAndDomain (...args) {
        return getters.floatingPoolNamesByCloudProfileNameAndRegionAndDomain({}, this)(...args)
      }
    }

    const cloudProfileName = 'foo'

    let region = 'fooRegion'
    let secretDomain = 'fooDomain'
    let dashboardFloatingPools = getters.floatingPoolNamesByCloudProfileNameAndRegionAndDomain({}, storeGetters)({ cloudProfileName, region, secretDomain })
    expect(dashboardFloatingPools).to.have.length(1)
    expect(dashboardFloatingPools[0]).to.equal('global FP')

    region = 'region1'
    secretDomain = 'fooDomain'
    dashboardFloatingPools = getters.floatingPoolNamesByCloudProfileNameAndRegionAndDomain({}, storeGetters)({ cloudProfileName, region, secretDomain })
    expect(dashboardFloatingPools).to.have.length(1)
    expect(dashboardFloatingPools[0]).to.equal('regional FP')

    region = 'region2'
    secretDomain = 'fooDomain'
    dashboardFloatingPools = getters.floatingPoolNamesByCloudProfileNameAndRegionAndDomain({}, storeGetters)({ cloudProfileName, region, secretDomain })
    expect(dashboardFloatingPools).to.have.length(2)
    expect(dashboardFloatingPools[0]).to.equal('global FP')
    expect(dashboardFloatingPools[1]).to.equal('regional non constraining FP')

    region = 'fooRegion'
    secretDomain = 'domain1'
    dashboardFloatingPools = getters.floatingPoolNamesByCloudProfileNameAndRegionAndDomain({}, storeGetters)({ cloudProfileName, region, secretDomain })
    expect(dashboardFloatingPools).to.have.length(1)
    expect(dashboardFloatingPools[0]).to.equal('domain specific FP')

    region = 'fooRegion'
    secretDomain = 'domain2'
    dashboardFloatingPools = getters.floatingPoolNamesByCloudProfileNameAndRegionAndDomain({}, storeGetters)({ cloudProfileName, region, secretDomain })
    expect(dashboardFloatingPools).to.have.length(2)
    expect(dashboardFloatingPools[0]).to.equal('global FP')
    expect(dashboardFloatingPools[1]).to.equal('domain specific non constraining FP')

    region = 'region3'
    secretDomain = 'domain3'
    dashboardFloatingPools = getters.floatingPoolNamesByCloudProfileNameAndRegionAndDomain({}, storeGetters)({ cloudProfileName, region, secretDomain })
    expect(dashboardFloatingPools).to.have.length(2)
    expect(dashboardFloatingPools[0]).to.equal('domain specific, regional FP')
    expect(dashboardFloatingPools[1]).to.equal('additional domain specific, regional FP')

    region = 'region4'
    secretDomain = 'domain4'
    dashboardFloatingPools = getters.floatingPoolNamesByCloudProfileNameAndRegionAndDomain({}, storeGetters)({ cloudProfileName, region, secretDomain })
    expect(dashboardFloatingPools).to.have.length(2)
    expect(dashboardFloatingPools[0]).to.equal('global FP')
    expect(dashboardFloatingPools[1]).to.equal('domain specific, regional non constraining FP')
  })

  it('should return load balancer provider names by region from cloud profile', function () {
    const cpLoadBalancerProviders = [
      {
        name: 'global LB'
      },
      {
        name: 'regional LB',
        region: 'region1'
      },
      {
        name: 'additional regional LB',
        region: 'region1'
      },
      {
        name: 'other regional LB',
        region: 'region2'
      }
    ]

    const storeGetters = {
      cloudProfileByName (cloudProfileName) {
        expect(cloudProfileName).to.equal('foo')
        return {
          data: {
            providerConfig: {
              constraints: {
                loadBalancerProviders: cpLoadBalancerProviders
              }
            }
          }
        }
      },
      loadBalancerProviderNamesByCloudProfileNameAndRegion (...args) {
        return getters.loadBalancerProviderNamesByCloudProfileNameAndRegion({}, this)(...args)
      }
    }

    const cloudProfileName = 'foo'

    let region = 'fooRegion'
    let dashboardLoadBalancerProviderNames = getters.loadBalancerProviderNamesByCloudProfileNameAndRegion({}, storeGetters)({ cloudProfileName, region })
    expect(dashboardLoadBalancerProviderNames).to.have.length(1)
    expect(dashboardLoadBalancerProviderNames[0]).to.equal('global LB')

    region = 'region1'
    dashboardLoadBalancerProviderNames = getters.loadBalancerProviderNamesByCloudProfileNameAndRegion({}, storeGetters)({ cloudProfileName, region })
    expect(dashboardLoadBalancerProviderNames).to.have.length(2)
    expect(dashboardLoadBalancerProviderNames[0]).to.equal('regional LB')
    expect(dashboardLoadBalancerProviderNames[1]).to.equal('additional regional LB')

    region = 'region2'
    dashboardLoadBalancerProviderNames = getters.loadBalancerProviderNamesByCloudProfileNameAndRegion({}, storeGetters)({ cloudProfileName, region })
    expect(dashboardLoadBalancerProviderNames).to.have.length(1)
    expect(dashboardLoadBalancerProviderNames[0]).to.equal('other regional LB')
  })

  it('should select default item that matches version classification', function () {
    const items = [
      {
        version: '1',
        classification: 'deprecated'
      },
      {
        version: '2'
      },
      {
        version: '3',
        classification: 'supported'
      }
    ]

    let item = firstItemMatchingVersionClassification(items)
    expect(item.version).to.equal('3')

    items.pop()
    item = firstItemMatchingVersionClassification(items)
    expect(item.version).to.equal('2')

    items.pop()
    item = firstItemMatchingVersionClassification(items)
    expect(item.version).to.equal('1')
  })
})
