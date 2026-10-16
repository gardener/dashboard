//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import { ref } from 'vue'

import { useMachineTypes } from '@/composables/useCloudProfile/useMachineTypes.js'
import { useRegions } from '@/composables/useCloudProfile/useRegions.js'

import find from 'lodash/find'

describe('composables', () => {
  describe('useMachineTypes', () => {
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
        const { useZones } = useRegions(cloudProfile)
        const { machineTypes } = useMachineTypes(cloudProfile, useZones)
        expect(machineTypes.value).toHaveLength(4)
        expect(machineTypes.value[0].name).toBe('machineType1')
        expect(machineTypes.value[3].name).toBe('machineType4')
      })
    })

    describe('#useFilteredMachineTypes', () => {
      it('should return machineTypes by region and zones from cloud profile', () => {
        const { useZones } = useRegions(cloudProfile)
        const { useFilteredMachineTypes } = useMachineTypes(cloudProfile, useZones)

        const region = ref('region1')
        const architecture = ref('amd64')
        let dashboardMachineTypes = useFilteredMachineTypes(region, architecture)
        expect(dashboardMachineTypes.value).toHaveLength(2)
        expect(dashboardMachineTypes.value[0].name).toBe('machineType1')
        expect(dashboardMachineTypes.value[1].name).toBe('machineType3')

        region.value = 'region2'
        architecture.value = 'arm64'
        dashboardMachineTypes = useFilteredMachineTypes(region, architecture)
        expect(dashboardMachineTypes.value).toHaveLength(1)
        expect(dashboardMachineTypes.value[0].name).toBe('machineType4')
      })

      it('should default architecture to amd64 if not specified', () => {
        const { useZones } = useRegions(cloudProfile)
        const { useFilteredMachineTypes } = useMachineTypes(cloudProfile, useZones)

        const region = ref('region2')
        const architecture = ref(undefined)
        const dashboardMachineTypes = useFilteredMachineTypes(region, architecture)

        // machineType2 and machineType3 should have amd64 as default
        const type2 = find(dashboardMachineTypes.value, { name: 'machineType2' })
        const type3 = find(dashboardMachineTypes.value, { name: 'machineType3' })
        expect(type2.architecture).toBe('amd64')
        expect(type3.architecture).toBe('amd64')
      })

      it('should include machine types that inherit architecture from spec.machineCapabilities', () => {
        cloudProfile.value = {
          ...cloudProfile.value,
          spec: {
            ...cloudProfile.value.spec,
            machineTypes: [
              {
                name: 'machineType1',
                capabilities: { architecture: ['amd64'] },
              },
              {
                name: 'machineType2',
                // No capabilities — should inherit from spec.machineCapabilities
              },
            ],
            machineCapabilities: [
              { name: 'architecture', values: ['amd64', 'arm64'] },
            ],
          },
        }

        const { useZones } = useRegions(cloudProfile)
        const { useFilteredMachineTypes } = useMachineTypes(cloudProfile, useZones)

        const region = ref('region2')

        // machineType2 inherits arm64 from profile defaults, so it should be included
        const arm64Types = useFilteredMachineTypes(region, ref('arm64'))
        expect(arm64Types.value).toHaveLength(1)
        expect(arm64Types.value[0].name).toBe('machineType2')

        // Both types should support amd64
        const amd64Types = useFilteredMachineTypes(region, ref('amd64'))
        expect(amd64Types.value).toHaveLength(2)
      })
    })

    describe('#useMachineArchitectures', () => {
      it('should return available architectures for a region', () => {
        const { useZones } = useRegions(cloudProfile)
        const { useMachineArchitectures } = useMachineTypes(cloudProfile, useZones)

        const region = ref('region2')
        const architectures = useMachineArchitectures(region)

        expect(architectures.value).toContain('amd64')
        expect(architectures.value).toContain('arm64')
        expect(architectures.value.length).toBeGreaterThanOrEqual(2)
      })

      it('should resolve inherited architectures from spec.machineCapabilities', () => {
        // Machine types: type with explicit capabilities, type without (should inherit profile defaults)
        cloudProfile.value = {
          ...cloudProfile.value,
          spec: {
            ...cloudProfile.value.spec,
            machineTypes: [
              {
                name: 'machineType1',
                capabilities: { architecture: ['amd64'] },
              },
              {
                name: 'machineType2',
                // No capabilities — should inherit from spec.machineCapabilities
              },
            ],
            machineCapabilities: [
              { name: 'architecture', values: ['amd64', 'arm64'] },
            ],
          },
        }

        const { useZones } = useRegions(cloudProfile)
        const { useMachineArchitectures } = useMachineTypes(cloudProfile, useZones)

        const region = ref('region2')
        const architectures = useMachineArchitectures(region)

        // arm64 must be included because machineType2 inherits it from spec.machineCapabilities
        expect(architectures.value).toContain('amd64')
        expect(architectures.value).toContain('arm64')
      })

      it('should fall back to deprecated type.architecture when no capabilities exist', () => {
        cloudProfile.value = {
          ...cloudProfile.value,
          spec: {
            ...cloudProfile.value.spec,
            machineTypes: [
              {
                name: 'machineType1',
                architecture: 'amd64',
              },
              {
                name: 'machineType2',
                architecture: 'arm64',
              },
            ],
            // No machineCapabilities
          },
        }

        const { useZones } = useRegions(cloudProfile)
        const { useMachineArchitectures } = useMachineTypes(cloudProfile, useZones)

        const region = ref('region2')
        const architectures = useMachineArchitectures(region)

        expect(architectures.value).toEqual(['amd64', 'arm64'])
      })
    })
  })
})