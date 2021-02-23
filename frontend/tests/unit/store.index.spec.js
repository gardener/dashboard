//
// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { getters, firstItemMatchingVersionClassification } from '@/store'
import find from 'lodash/find'
import noop from 'lodash/noop'

global.console.error = noop // do not log (expected) errors in tests

describe('Store', () => {
  it('should transform machine images from cloud profile', () => {
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
        expect(cloudProfileName).toBe('foo')
        return {
          data: {
            machineImages: cpMachineImages
          }
        }
      }
    }

    const dashboardMachineImages = getters.machineImagesByCloudProfileName({}, storeGetters)('foo')
    expect(dashboardMachineImages).toHaveLength(5)

    const expiredImage = find(dashboardMachineImages, { name: 'suse-chost', version: '15.1.20191127' })
    expect(expiredImage.isExpired).toBe(true)

    const invalidImage = find(dashboardMachineImages, { name: 'foo', version: '1.02.3' })
    expect(invalidImage).toBeUndefined()

    const suseImage = find(dashboardMachineImages, { name: 'suse-chost', version: '15.1.20191027' })
    expect(suseImage.expirationDate).toBe('2119-04-05T01:02:03Z')
    expect(suseImage.expirationDateString).toBeDefined()
    expect(suseImage.vendorName).toBe('suse-chost')
    expect(suseImage.icon).toBe('suse-chost')
    expect(suseImage.needsLicense).toBe(true)
    expect(suseImage.classification).toBe('supported')
    expect(suseImage.isSupported).toBe(true)
    expect(suseImage.isDeprecated).toBe(false)
    expect(suseImage.isPreview).toBe(false)
    expect(suseImage).toBe(dashboardMachineImages[2]) // check sorting

    const fooImage = find(dashboardMachineImages, { name: 'foo', version: '1.2.3' })
    expect(fooImage.needsLicense).toBe(false)
    expect(fooImage.isSupported).toBe(false)
  })

  it('should filter kubernetes versions from cloud profile', () => {
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
        expect(cloudProfileName).toBe('foo')
        return {
          data: {
            kubernetes: {
              versions: kubernetesVersions
            }
          }
        }
      },
      kubernetesVersions (cloudProfileName) {
        expect(cloudProfileName).toBe('foo')
        return getters.kubernetesVersions({}, this)(cloudProfileName)
      }
    }

    const dashboardVersions = getters.sortedKubernetesVersions({}, storeGetters)('foo')
    expect(dashboardVersions).toHaveLength(3)

    const expiredVersion = find(dashboardVersions, { version: '1.16.2' })
    expect(expiredVersion.isExpired).toBe(true)

    const invalidVersion = find(dashboardVersions, { version: '1.06.2' })
    expect(invalidVersion).toBeUndefined()

    const kubernetesVersion = find(dashboardVersions, { version: '1.16.3' })
    expect(kubernetesVersion.expirationDate).toBe('2120-04-12T23:59:59Z')
    expect(kubernetesVersion.expirationDateString).toBeDefined()
    expect(kubernetesVersion.classification).toBe('supported')
    expect(kubernetesVersion).toBe(dashboardVersions[0]) // check sorting
  })

  it('should return machineTypes by region and zones from cloud profile', () => {
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
        expect(cloudProfileName).toBe('foo')
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
    expect(dashboardMachineTypes).toHaveLength(3)

    dashboardMachineTypes = getters.machineTypesByCloudProfileNameAndRegionAndZones({}, storeGetters)({ cloudProfileName: 'foo', region: 'region1', zones: ['zone2'] })
    expect(dashboardMachineTypes).toHaveLength(2)
    expect(dashboardMachineTypes[0].name).toBe('machineType1')
    expect(dashboardMachineTypes[1].name).toBe('machineType3')

    dashboardMachineTypes = getters.machineTypesByCloudProfileNameAndRegionAndZones({}, storeGetters)({ cloudProfileName: 'foo', region: 'region1', zones: ['zone1', 'zone3'] })
    expect(dashboardMachineTypes).toHaveLength(3)

    dashboardMachineTypes = getters.machineTypesByCloudProfileNameAndRegionAndZones({}, storeGetters)({ cloudProfileName: 'foo', region: 'region2', zones: ['zone1'] })
    expect(dashboardMachineTypes).toHaveLength(3)
  })

  it('should return volumeTypes by region and zones from cloud profile', () => {
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
        expect(cloudProfileName).toBe('foo')
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
    expect(dashboardVolumeTypes).toHaveLength(3)

    dashboardVolumeTypes = getters.volumeTypesByCloudProfileNameAndRegionAndZones({}, storeGetters)({ cloudProfileName: 'foo', region: 'region1', zones: ['zone1'] })
    expect(dashboardVolumeTypes).toHaveLength(3)

    dashboardVolumeTypes = getters.volumeTypesByCloudProfileNameAndRegionAndZones({}, storeGetters)({ cloudProfileName: 'foo', region: 'region1', zones: ['zone2', 'zone3'] })
    expect(dashboardVolumeTypes).toHaveLength(0)

    dashboardVolumeTypes = getters.volumeTypesByCloudProfileNameAndRegionAndZones({}, storeGetters)({ cloudProfileName: 'foo', region: 'region1', zones: ['zone3'] })
    expect(dashboardVolumeTypes).toHaveLength(1)
    expect(dashboardVolumeTypes[0].name).toBe('volumeType2')

    dashboardVolumeTypes = getters.volumeTypesByCloudProfileNameAndRegionAndZones({}, storeGetters)({ cloudProfileName: 'foo', region: 'region2', zones: ['zone1'] })
    expect(dashboardVolumeTypes).toHaveLength(3)
  })

  it('should return an empty machineType / volumeType array if no cloud profile is provided', () => {
    const items = getters.machineTypesOrVolumeTypesByCloudProfileNameAndRegionAndZones({}, getters)({ })
    expect(items).toBeInstanceOf(Array)
    expect(items).toHaveLength(0)
  })

  it('should return floating pool names by region and domain from cloud profile', () => {
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
        expect(cloudProfileName).toBe('foo')
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
    expect(dashboardFloatingPools).toHaveLength(1)
    expect(dashboardFloatingPools[0]).toBe('global FP')

    region = 'region1'
    secretDomain = 'fooDomain'
    dashboardFloatingPools = getters.floatingPoolNamesByCloudProfileNameAndRegionAndDomain({}, storeGetters)({ cloudProfileName, region, secretDomain })
    expect(dashboardFloatingPools).toHaveLength(1)
    expect(dashboardFloatingPools[0]).toBe('regional FP')

    region = 'region2'
    secretDomain = 'fooDomain'
    dashboardFloatingPools = getters.floatingPoolNamesByCloudProfileNameAndRegionAndDomain({}, storeGetters)({ cloudProfileName, region, secretDomain })
    expect(dashboardFloatingPools).toHaveLength(2)
    expect(dashboardFloatingPools[0]).toBe('global FP')
    expect(dashboardFloatingPools[1]).toBe('regional non constraining FP')

    region = 'fooRegion'
    secretDomain = 'domain1'
    dashboardFloatingPools = getters.floatingPoolNamesByCloudProfileNameAndRegionAndDomain({}, storeGetters)({ cloudProfileName, region, secretDomain })
    expect(dashboardFloatingPools).toHaveLength(1)
    expect(dashboardFloatingPools[0]).toBe('domain specific FP')

    region = 'fooRegion'
    secretDomain = 'domain2'
    dashboardFloatingPools = getters.floatingPoolNamesByCloudProfileNameAndRegionAndDomain({}, storeGetters)({ cloudProfileName, region, secretDomain })
    expect(dashboardFloatingPools).toHaveLength(2)
    expect(dashboardFloatingPools[0]).toBe('global FP')
    expect(dashboardFloatingPools[1]).toBe('domain specific non constraining FP')

    region = 'region3'
    secretDomain = 'domain3'
    dashboardFloatingPools = getters.floatingPoolNamesByCloudProfileNameAndRegionAndDomain({}, storeGetters)({ cloudProfileName, region, secretDomain })
    expect(dashboardFloatingPools).toHaveLength(2)
    expect(dashboardFloatingPools[0]).toBe('domain specific, regional FP')
    expect(dashboardFloatingPools[1]).toBe('additional domain specific, regional FP')

    region = 'region4'
    secretDomain = 'domain4'
    dashboardFloatingPools = getters.floatingPoolNamesByCloudProfileNameAndRegionAndDomain({}, storeGetters)({ cloudProfileName, region, secretDomain })
    expect(dashboardFloatingPools).toHaveLength(2)
    expect(dashboardFloatingPools[0]).toBe('global FP')
    expect(dashboardFloatingPools[1]).toBe('domain specific, regional non constraining FP')
  })

  it('should return load balancer provider names by region from cloud profile', () => {
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
        expect(cloudProfileName).toBe('foo')
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
    expect(dashboardLoadBalancerProviderNames).toHaveLength(1)
    expect(dashboardLoadBalancerProviderNames[0]).toBe('global LB')

    region = 'region1'
    dashboardLoadBalancerProviderNames = getters.loadBalancerProviderNamesByCloudProfileNameAndRegion({}, storeGetters)({ cloudProfileName, region })
    expect(dashboardLoadBalancerProviderNames).toHaveLength(2)
    expect(dashboardLoadBalancerProviderNames[0]).toBe('regional LB')
    expect(dashboardLoadBalancerProviderNames[1]).toBe('additional regional LB')

    region = 'region2'
    dashboardLoadBalancerProviderNames = getters.loadBalancerProviderNamesByCloudProfileNameAndRegion({}, storeGetters)({ cloudProfileName, region })
    expect(dashboardLoadBalancerProviderNames).toHaveLength(1)
    expect(dashboardLoadBalancerProviderNames[0]).toBe('other regional LB')
  })

  it('should select default item that matches version classification', () => {
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
    expect(item.version).toBe('3')

    items.pop()
    item = firstItemMatchingVersionClassification(items)
    expect(item.version).toBe('2')

    items.pop()
    item = firstItemMatchingVersionClassification(items)
    expect(item.version).toBe('1')
  })

  it('should return custom fields for shoots', () => {
    const custom1 = {
      weight: 1,
      defaultValue: 'Default',
      path: 'metadata.name',
      name: 'Column Name',
      showColumn: true,
      showDetails: true,
      icon: 'mdi-icon'
    }
    const custom2 = {
      name: 'Name',
      path: 'path'
    }

    const shootCustomFields = {
      custom1,
      custom2,
      custom3: { // ignored, missing required property path
        name: 'name'
      },
      custom4: { // ignored, missing required property name
        path: 'path'
      },
      custom5: {}, // ignored
      custom6: null, // ignored
      custom7: { // ignored
        name: 'Foo',
        path: { foo: 'bar' } // no objects allowed as values of custom field properties
      }
    }

    const storeGetters = {
      projectFromProjectList: {
        metadata: {
          annotations: {
            'dashboard.gardener.cloud/shootCustomFields': JSON.stringify(shootCustomFields)
          }
        }
      }
    }

    const customFields = getters.shootCustomFields({}, storeGetters)
    expect(customFields).toStrictEqual({
      Z_custom1: {
        weight: 1,
        defaultValue: 'Default',
        path: 'metadata.name',
        name: 'Column Name',
        showColumn: true,
        showDetails: true,
        icon: 'mdi-icon',
        columnSelectedByDefault: true,
        searchable: true,
        sortable: true
      },
      Z_custom2: {
        name: 'Name',
        path: 'path',
        columnSelectedByDefault: true,
        searchable: true,
        showColumn: true,
        showDetails: true,
        sortable: true
      }
    })
  })
})
