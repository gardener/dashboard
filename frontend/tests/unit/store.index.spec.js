//
// Copyright (c) 2019 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file
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
import { getters } from '@/store'
import find from 'lodash/find'

describe('Store', function () {
  it('should transform machine images from cloud profile', function () {
    const cpMachineImages = [
      {
        'name': 'coreos',
        'versions': [
          {
            'version': '2135.6.0'
          }
        ]
      },
      {
        'name': 'suse-chost',
        'versions': [
          {
            'version': '15.1.20190927'
          },
          {
            'version': '15.1.20191027',
            'expirationDate': '2119-04-05T01:02:03Z' // not expired
          },
          {
            'version': '15.1.20191127',
            'expirationDate': '2019-04-05T01:02:03Z' // expired
          }
        ]
      },
      {
        'name': 'foo',
        'versions': [
          {
            'version': '1.02.3' // invalid version (not semver compatible)
          },
          {
            'version': '1.2.3'
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
    expect(suseImage).to.equal(dashboardMachineImages[1]) // check sorting

    const fooImage = find(dashboardMachineImages, { name: 'foo', version: '1.2.3' })
    expect(fooImage.needsLicense).to.equal(false)
  })

  it('should filter kubernetes versions from cloud profile', function () {
    const kubernetesVersions = [
      {
        'version': '1.13.4'
      },
      {
        'expirationDate': '2120-04-12T23:59:59Z', // not expired
        'version': '1.16.3'
      },
      {
        'expirationDate': '2019-03-15T23:59:59Z', // expired
        'version': '1.16.2'
      },
      {
        'version': '1.06.2' // invalid version (not semver compatible)
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
    expect(kubernetesVersion).to.equal(dashboardVersions[0]) // check sorting
  })

  it('should return machineTypes by region and zones from cloud profile', function () {
    const cpMachineTypes = [
      {
        'name': 'machineType1'
      },
      {
        'name': 'machineType2'
      },
      {
        'name': 'machineType3'
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
        'name': 'volumeType1'
      },
      {
        'name': 'volumeType2'
      },
      {
        'name': 'volumeType3'
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
})
