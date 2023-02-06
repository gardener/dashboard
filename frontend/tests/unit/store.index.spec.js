// SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { getters, firstItemMatchingVersionClassification } from '@/store'
import find from 'lodash/find'

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
            version: '15.1.20190927',
            classification: 'preview'
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

    const storeState = {
      cfg: {
        vendorHints: [
          {
            matchNames: [
              'suse-jeos',
              'suse-chost'
            ],
            message: 'test',
            type: 'warning'
          }
        ]
      }
    }

    const dashboardMachineImages = getters.machineImagesByCloudProfileName(storeState, storeGetters)('foo')
    expect(dashboardMachineImages).toHaveLength(5)

    const expiredImage = find(dashboardMachineImages, { name: 'suse-chost', version: '15.1.20191127' })
    expect(expiredImage.isExpired).toBe(true)
    expect(expiredImage.isSupported).toBe(false)

    const invalidImage = find(dashboardMachineImages, { name: 'foo', version: '1.02.3' })
    expect(invalidImage).toBeUndefined()

    const suseImage = find(dashboardMachineImages, { name: 'suse-chost', version: '15.1.20191027' })
    expect(suseImage.expirationDate).toBe('2119-04-05T01:02:03Z')
    expect(suseImage.expirationDateString).toBeDefined()
    expect(suseImage.vendorName).toBe('suse-chost')
    expect(suseImage.icon).toBe('suse-chost')
    expect(suseImage.vendorHint).toEqual(storeState.cfg.vendorHints[0])
    expect(suseImage.classification).toBe('supported')
    expect(suseImage.isSupported).toBe(true)
    expect(suseImage.isDeprecated).toBe(false)
    expect(suseImage.isPreview).toBe(false)
    expect(suseImage).toBe(dashboardMachineImages[2]) // check sorting

    const suseImage2 = find(dashboardMachineImages, { name: 'suse-chost', version: '15.1.20190927' })
    expect(suseImage2.isSupported).toBe(false)
    expect(suseImage2.isPreview).toBe(true)

    const fooImage = find(dashboardMachineImages, { name: 'foo', version: '1.2.3' })
    expect(fooImage.vendorHint).toBeUndefined()
    expect(fooImage.isSupported).toBe(true)
  })

  it('should filter kubernetes versions from cloud profile', () => {
    const kubernetesVersions = [
      {
        version: '1.13.4',
        classification: 'deprecated'
      },
      {
        version: '1.14.0'
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
    expect(dashboardVersions).toHaveLength(4)

    const expiredVersion = find(dashboardVersions, { version: '1.16.2' })
    expect(expiredVersion.isExpired).toBe(true)
    expect(expiredVersion.isSupported).toBe(false)

    const invalidVersion = find(dashboardVersions, { version: '1.06.2' })
    expect(invalidVersion).toBeUndefined()

    const supportedVersion = find(dashboardVersions, { version: '1.14.0' })
    expect(supportedVersion.isSupported).toBe(true)

    const kubernetesVersion = find(dashboardVersions, { version: '1.16.3' })
    expect(kubernetesVersion.expirationDate).toBe('2120-04-12T23:59:59Z')
    expect(kubernetesVersion.expirationDateString).toBeDefined()
    expect(kubernetesVersion.isSupported).toBe(true)
    expect(kubernetesVersion).toBe(dashboardVersions[0]) // check sorting
  })

  describe('machine type / volume type getters', () => {
    let storeGetters

    beforeEach(async () => {
      const cpMachineTypes = [
        {
          name: 'machineType1',
          architecture: 'amd64'
        },
        {
          name: 'machineType2'
        },
        {
          name: 'machineType3'
        },
        {
          name: 'machineType4',
          architecture: 'arm64'
        }
      ]

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

      storeGetters = {
        cloudProfileByName (cloudProfileName) {
          expect(cloudProfileName).toBe('foo')
          return {
            data: {
              machineTypes: cpMachineTypes,
              volumeTypes: cpVolumeTypes,
              regions: [
                {
                  name: 'region1',
                  zones: [
                    {
                      name: 'zone1',
                      unavailableMachineTypes: [
                        'machineType2'
                      ],
                      unavailableVolumeTypes: [
                        'volumeType2'
                      ]
                    },
                    {
                      name: 'zone2',
                      unavailableMachineTypes: [
                        'machineType2',
                        'machineType1'
                      ],
                      unavailableVolumeTypes: [
                        'volumeType2'
                      ]
                    },
                    {
                      name: 'zone3',
                      unavailableMachineTypes: [
                        'machineType2'
                      ],
                      unavailableVolumeTypes: [
                        'volumeType2',
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
        volumeTypesByCloudProfileNameAndRegion (...args) {
          return getters.volumeTypesByCloudProfileNameAndRegion({}, this)(...args)
        },
        machineTypesByCloudProfileNameAndRegionAndArchitecture (...args) {
          return getters.machineTypesByCloudProfileNameAndRegionAndArchitecture({}, this)(...args)
        },
        machineTypesOrVolumeTypesByCloudProfileNameAndRegion (...args) {
          return getters.machineTypesOrVolumeTypesByCloudProfileNameAndRegion({}, this)(...args)
        },
        zonesByCloudProfileNameAndRegion (...args) {
          return getters.zonesByCloudProfileNameAndRegion({}, this)(...args)
        },
        unavailableZonesByCloudProfileNameAndRegionAndZonesAndItem (...args) {
          return getters.unavailableZonesByCloudProfileNameAndRegionAndZonesAndItem({}, this)(...args)
        }
      }
    })

    it('should return machineTypes by region and zones from cloud profile', () => {
      let dashboardMachineTypes = getters.machineTypesByCloudProfileName({}, storeGetters)({ cloudProfileName: 'foo' })
      expect(dashboardMachineTypes).toHaveLength(4)

      dashboardMachineTypes = getters.machineTypesByCloudProfileNameAndRegionAndArchitecture({}, storeGetters)({ cloudProfileName: 'foo', region: 'region1', architecture: 'amd64' })
      expect(dashboardMachineTypes).toHaveLength(2)
      expect(dashboardMachineTypes[0].name).toBe('machineType1')
      expect(dashboardMachineTypes[1].name).toBe('machineType3')

      dashboardMachineTypes = getters.machineTypesByCloudProfileNameAndRegionAndArchitecture({}, storeGetters)({ cloudProfileName: 'foo', region: 'region2', architecture: 'arm64' })
      expect(dashboardMachineTypes).toHaveLength(1)
      expect(dashboardMachineTypes[0].name).toBe('machineType4')
    })

    it('should return unavailable zones by region and zones and machine type from cloud profile', () => {
      const unavailableZones = getters.unavailableZonesByCloudProfileNameAndRegionAndZonesAndMachineType({}, storeGetters)({ cloudProfileName: 'foo', region: 'region1', zones: ['zone1', 'zone2'], machineType: 'machineType1' })
      expect(unavailableZones).toHaveLength(1)
      expect(unavailableZones[0]).toBe('zone2')
    })

    it('should return volumeTypes by region and zones from cloud profile', () => {
      let dashboardVolumeTypes = getters.volumeTypesByCloudProfileName({}, storeGetters)({ cloudProfileName: 'foo' })
      expect(dashboardVolumeTypes).toHaveLength(3)

      dashboardVolumeTypes = getters.volumeTypesByCloudProfileNameAndRegion({}, storeGetters)({ cloudProfileName: 'foo', region: 'region1' })
      expect(dashboardVolumeTypes).toHaveLength(2)

      dashboardVolumeTypes = getters.volumeTypesByCloudProfileNameAndRegion({}, storeGetters)({ cloudProfileName: 'foo', region: 'region2' })
      expect(dashboardVolumeTypes).toHaveLength(3)
    })

    it('should return unavailable zones by region and zones and volume type from cloud profile', () => {
      const unavailableZones = getters.unavailableZonesByCloudProfileNameAndRegionAndZonesAndVolumeType({}, storeGetters)({ cloudProfileName: 'foo', region: 'region1', zones: ['zone1', 'zone2', 'zone3'], volumeType: 'volumeType3' })
      expect(unavailableZones).toHaveLength(1)
      expect(unavailableZones[0]).toBe('zone3')
    })

    it('should return an empty machineType / volumeType array if no cloud profile is provided', () => {
      const items = getters.machineTypesOrVolumeTypesByCloudProfileNameAndRegion({}, getters)({})
      expect(items).toBeInstanceOf(Array)
      expect(items).toHaveLength(0)
    })
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
      floatingPoolsByCloudProfileNameAndRegionAndDomain (...args) {
        return getters.floatingPoolsByCloudProfileNameAndRegionAndDomain({}, this)(...args)
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
