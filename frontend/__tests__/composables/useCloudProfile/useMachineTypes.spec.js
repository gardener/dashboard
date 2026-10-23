//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import { ref } from 'vue'

import { useMachineTypes } from '@/composables/useCloudProfile/useMachineTypes.js'

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
        const { machineTypes } = useMachineTypes(cloudProfile)
        expect(machineTypes.value).toHaveLength(4)
        expect(machineTypes.value[0].name).toBe('machineType1')
        expect(machineTypes.value[3].name).toBe('machineType4')
      })
    })

    describe('#useFilteredMachineTypes', () => {
      it('should return machineTypes by region and zones from cloud profile', () => {
        const { useFilteredMachineTypes } = useMachineTypes(cloudProfile)

        const region = ref('region1')
        const architecture = ref('amd64')
        let dashboardMachineTypes = useFilteredMachineTypes(region, architecture)
        // Only machineType1 has architecture 'amd64'; machineType2 is unavailable in all zones,
        // machineType3 has no architecture and no capabilities so it does not match
        expect(dashboardMachineTypes.value).toHaveLength(1)
        expect(dashboardMachineTypes.value[0].name).toBe('machineType1')

        region.value = 'region2'
        architecture.value = 'arm64'
        dashboardMachineTypes = useFilteredMachineTypes(region, architecture)
        expect(dashboardMachineTypes.value).toHaveLength(1)
        expect(dashboardMachineTypes.value[0].name).toBe('machineType4')
      })

      it('should return raw machine types without default architecture when architecture is not specified', () => {
        const { useFilteredMachineTypes } = useMachineTypes(cloudProfile)

        const region = ref('region2')
        const architecture = ref(undefined)
        const dashboardMachineTypes = useFilteredMachineTypes(region, architecture)

        // When no architecture filter is set, all machine types for the region are returned as-is.
        // Machine types without an architecture field are NOT assigned a default (e.g. amd64).
        expect(dashboardMachineTypes.value).toHaveLength(4)
        const mt2 = dashboardMachineTypes.value.find(t => t.name === 'machineType2')
        const mt3 = dashboardMachineTypes.value.find(t => t.name === 'machineType3')
        expect(mt2).not.toHaveProperty('architecture')
        expect(mt3).not.toHaveProperty('architecture')
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

        const { useFilteredMachineTypes } = useMachineTypes(cloudProfile)

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
        const { useMachineArchitectures } = useMachineTypes(cloudProfile)

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

        const { useMachineArchitectures } = useMachineTypes(cloudProfile)

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

        const { useMachineArchitectures } = useMachineTypes(cloudProfile)

        const region = ref('region2')
        const architectures = useMachineArchitectures(region)

        expect(architectures.value).toEqual(['amd64', 'arm64'])
      })
    })
  })
})
