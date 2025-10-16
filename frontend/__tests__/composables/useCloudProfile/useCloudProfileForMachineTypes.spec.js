//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { ref } from 'vue'

import { useCloudProfileForMachineTypes } from '@/composables/useCloudProfile/useCloudProfileForMachineTypes'

import find from 'lodash/find'
import get from 'lodash/get'
import some from 'lodash/some'

describe('composables', () => {
  describe('useCloudProfileForMachineTypes', () => {
    let cloudProfile

    const machineTypes = [
      {
        name: 'machineType1',
        architecture: 'amd64',
      },
      {
        name: 'machineType2',
      },
      {
        name: 'machineType3',
      },
      {
        name: 'machineType4',
        architecture: 'arm64',
      },
    ]
    const regions = [
      {
        name: 'region1',
        zones: [
          {
            name: 'zone1',
            unavailableMachineTypes: [
              'machineType2',
            ],
          },
          {
            name: 'zone2',
            unavailableMachineTypes: [
              'machineType2',
              'machineType1',
            ],
          },
          {
            name: 'zone3',
            unavailableMachineTypes: [
              'machineType2',
            ],
          },
        ],
      },
      {
        name: 'region2',
        zones: [
          {
            name: 'zone1',
          },
        ],
      },
    ]

    // Simplified version of zonesByCloudProfileAndRegion for testing
    function zonesByCloudProfileAndRegion ({ cloudProfile: cp, region }) {
      const providerType = cp.spec.type
      const regionObj = find(cp.spec.regions, { name: region })
      const zones = get(regionObj, ['zones'], [])

      if (providerType === 'azure') {
        return zones.filter(zone => zone.name).map(zone => zone.name)
      }

      if (!some(cp.spec.regions, ['name', region])) {
        return []
      }

      return zones.map(zone => zone.name)
    }

    beforeEach(() => {
      cloudProfile = ref({
        metadata: {
          name: 'foo',
        },
        kind: 'CloudProfile',
        name: 'foo',
        spec: {
          type: 'aws',
          machineTypes,
          regions,
        },
      })
    })

    describe('#machineTypes', () => {
      it('should return all machine types from cloud profile', () => {
        const { machineTypes: allTypes } = useCloudProfileForMachineTypes(cloudProfile, zonesByCloudProfileAndRegion)
        expect(allTypes.value).toHaveLength(4)
        expect(allTypes.value[0].name).toBe('machineType1')
        expect(allTypes.value[3].name).toBe('machineType4')
      })
    })

    describe('#machineTypesByRegionAndArchitecture', () => {
      it('should return machineTypes by region and zones from cloud profile', () => {
        const { machineTypesByRegionAndArchitecture } = useCloudProfileForMachineTypes(cloudProfile, zonesByCloudProfileAndRegion)

        const region = ref('region1')
        const architecture = ref('amd64')
        let dashboardMachineTypes = machineTypesByRegionAndArchitecture(region, architecture)
        expect(dashboardMachineTypes.value).toHaveLength(2)
        expect(dashboardMachineTypes.value[0].name).toBe('machineType1')
        expect(dashboardMachineTypes.value[1].name).toBe('machineType3')

        region.value = 'region2'
        architecture.value = 'arm64'
        dashboardMachineTypes = machineTypesByRegionAndArchitecture(region, architecture)
        expect(dashboardMachineTypes.value).toHaveLength(1)
        expect(dashboardMachineTypes.value[0].name).toBe('machineType4')
      })

      it('should default architecture to amd64 if not specified', () => {
        const { machineTypesByRegionAndArchitecture } = useCloudProfileForMachineTypes(cloudProfile, zonesByCloudProfileAndRegion)

        const region = ref('region2')
        const architecture = ref(undefined)
        const dashboardMachineTypes = machineTypesByRegionAndArchitecture(region, architecture)

        // machineType2 and machineType3 should have amd64 as default
        const type2 = find(dashboardMachineTypes.value, { name: 'machineType2' })
        const type3 = find(dashboardMachineTypes.value, { name: 'machineType3' })
        expect(type2.architecture).toBe('amd64')
        expect(type3.architecture).toBe('amd64')
      })
    })

    describe('#machineArchitecturesByRegion', () => {
      it('should return available architectures for a region', () => {
        const { machineArchitecturesByRegion } = useCloudProfileForMachineTypes(cloudProfile, zonesByCloudProfileAndRegion)

        const region = ref('region2')
        const architectures = machineArchitecturesByRegion(region)

        expect(architectures.value).toContain('amd64')
        expect(architectures.value).toContain('arm64')
        expect(architectures.value.length).toBeGreaterThanOrEqual(2)
      })
    })
  })
})
