//
// SPDX-FileCopyrightText: 2025 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { ref } from 'vue'
import { setActivePinia } from 'pinia'
import { createTestingPinia } from '@pinia/testing'

import { useVolumeTypes } from '@/composables/useCloudProfile/useVolumeTypes'

import find from 'lodash/find'

describe('composables', () => {
  describe('useVolumeTypes', () => {
    beforeEach(() => {
      const pinia = createTestingPinia()
      setActivePinia(pinia)
    })
    let cloudProfile

    beforeEach(() => {
      cloudProfile = ref({
        metadata: {
          name: 'aws',
        },
        kind: 'CloudProfile',
        spec: {
          regions: [
            {
              name: 'eu-central-1',
              zones: [
                {
                  name: 'eu-central-1a',
                  unavailableVolumeTypes: [
                    'gp3',
                  ],
                },
                {
                  name: 'eu-central-1b',
                  unavailableVolumeTypes: [
                    'gp3',
                  ],
                },
                {
                  name: 'eu-central-1c',
                  unavailableVolumeTypes: [
                    'gp3',
                    'io1',
                  ],
                },
              ],
            },
            {
              name: 'eu-west-1',
              zones: [
                {
                  name: 'eu-west-1a',
                },
                {
                  name: 'eu-west-1b',
                },
                {
                  name: 'eu-west-1c',
                  unavailableVolumeTypes: [
                    'io1',
                  ],
                },
              ],
            },
            {
              name: 'us-east-1',
              zones: [
                {
                  name: 'us-east-1a',
                },
                {
                  name: 'us-east-1b',
                },
                {
                  name: 'us-east-1c',
                },
              ],
            },
          ],
          volumeTypes: [
            {
              class: 'standard',
              name: 'gp3',
              usable: true,
            },
            {
              class: 'standard',
              name: 'gp2',
              usable: true,
            },
            {
              class: 'standard',
              name: 'io1',
              usable: true,
              minSize: '4Gi',
            },
            {
              class: 'standard',
              name: 'sc1',
              usable: false,
            },
          ],
        },
      })
    })

    describe('#volumeTypes', () => {
      it('should return all volume types from cloud profile', () => {
        const { volumeTypes } = useVolumeTypes(cloudProfile)
        expect(volumeTypes.value).toHaveLength(4)
        expect(volumeTypes.value).toEqual([
          {
            class: 'standard',
            name: 'gp3',
            usable: true,
          },
          {
            class: 'standard',
            name: 'gp2',
            usable: true,
          },
          {
            class: 'standard',
            name: 'io1',
            usable: true,
            minSize: '4Gi',
          },
          {
            class: 'standard',
            name: 'sc1',
            usable: false,
          },
        ])
      })
    })

    describe('#useFilteredVolumeTypes', () => {
      it('should return all volume types when no region specified', () => {
        const { useFilteredVolumeTypes } = useVolumeTypes(cloudProfile)
        const region = ref(undefined)
        const volumeTypes = useFilteredVolumeTypes(region)
        expect(volumeTypes.value).toHaveLength(4)
      })

      it('should return volume types available in all zones of a region', () => {
        const { useFilteredVolumeTypes } = useVolumeTypes(cloudProfile)
        const region = ref('eu-central-1')
        const volumeTypes = useFilteredVolumeTypes(region)
        expect(volumeTypes.value).toHaveLength(2)
        const gp2 = find(volumeTypes.value, { name: 'gp2' })
        const io1 = find(volumeTypes.value, { name: 'io1' })
        expect(gp2).toBeDefined()
        expect(io1).toBeDefined()
      })

      it('should filter out volume types unavailable in all zones', () => {
        const { useFilteredVolumeTypes } = useVolumeTypes(cloudProfile)
        const region = ref('eu-central-1')
        const volumeTypes = useFilteredVolumeTypes(region)
        const gp3 = find(volumeTypes.value, { name: 'gp3' })
        expect(gp3).toBeUndefined()
      })

      it('should include volume types unavailable in some zones but available in others', () => {
        const { useFilteredVolumeTypes } = useVolumeTypes(cloudProfile)
        const region = ref('eu-west-1')
        const volumeTypes = useFilteredVolumeTypes(region)
        expect(volumeTypes.value).toHaveLength(3)
        const gp3 = find(volumeTypes.value, { name: 'gp3' })
        const gp2 = find(volumeTypes.value, { name: 'gp2' })
        const io1 = find(volumeTypes.value, { name: 'io1' })
        expect(gp3).toBeDefined()
        expect(gp2).toBeDefined()
        expect(io1).toBeDefined()
      })

      it('should filter out volume types marked as not usable', () => {
        const { useFilteredVolumeTypes } = useVolumeTypes(cloudProfile)
        const region = ref('us-east-1')
        const volumeTypes = useFilteredVolumeTypes(region)
        expect(volumeTypes.value).toHaveLength(3)
        const sc1 = find(volumeTypes.value, { name: 'sc1' })
        expect(sc1).toBeUndefined()
      })

      it('should return empty array when cloud profile is null', () => {
        cloudProfile.value = null
        const { useFilteredVolumeTypes } = useVolumeTypes(cloudProfile)
        const region = ref('eu-central-1')
        const volumeTypes = useFilteredVolumeTypes(region)
        expect(volumeTypes.value).toEqual([])
      })

      it('should throw error when region is not a ref', () => {
        const { useFilteredVolumeTypes } = useVolumeTypes(cloudProfile)
        const region = 'eu-central-1'
        expect(() => {
          const volumeTypes = useFilteredVolumeTypes(region)
          // Access the computed value to trigger validation
          volumeTypes.value // eslint-disable-line no-unused-expressions
        }).toThrow('region must be a ref!')
      })
    })

    describe('#useMinimumVolumeSize', () => {
      it('should return minSize from volume type when volume type has name', () => {
        const { useMinimumVolumeSize } = useVolumeTypes(cloudProfile)
        const machineType = ref({})
        const volumeType = ref({
          name: 'io1',
          minSize: '4Gi',
        })
        const minSize = useMinimumVolumeSize(machineType, volumeType)
        expect(minSize.value).toBe('4Gi')
      })

      it('should return 0Gi when volume type has name but no minSize', () => {
        const { useMinimumVolumeSize } = useVolumeTypes(cloudProfile)
        const machineType = ref({})
        const volumeType = ref({
          name: 'gp2',
        })
        const minSize = useMinimumVolumeSize(machineType, volumeType)
        expect(minSize.value).toBe('0Gi')
      })

      it('should return minSize from machine type storage when volume type has no name', () => {
        const { useMinimumVolumeSize } = useVolumeTypes(cloudProfile)
        const machineType = ref({
          storage: {
            minSize: '64Gi',
          },
        })
        const volumeType = ref({})
        const minSize = useMinimumVolumeSize(machineType, volumeType)
        expect(minSize.value).toBe('64Gi')
      })

      it('should return 0Gi when neither volume type nor machine type have minSize', () => {
        const { useMinimumVolumeSize } = useVolumeTypes(cloudProfile)
        const machineType = ref({})
        const volumeType = ref({})
        const minSize = useMinimumVolumeSize(machineType, volumeType)
        expect(minSize.value).toBe('0Gi')
      })

      it('should return 0Gi when machine type has storage but no minSize', () => {
        const { useMinimumVolumeSize } = useVolumeTypes(cloudProfile)
        const machineType = ref({
          storage: {
            type: 'default',
          },
        })
        const volumeType = ref({})
        const minSize = useMinimumVolumeSize(machineType, volumeType)
        expect(minSize.value).toBe('0Gi')
      })

      it('should prioritize volume type minSize over machine type storage', () => {
        const { useMinimumVolumeSize } = useVolumeTypes(cloudProfile)
        const machineType = ref({
          storage: {
            minSize: '64Gi',
          },
        })
        const volumeType = ref({
          name: 'io1',
          minSize: '4Gi',
        })
        const minSize = useMinimumVolumeSize(machineType, volumeType)
        expect(minSize.value).toBe('4Gi')
      })

      it('should throw error when machineType is not a ref', () => {
        const { useMinimumVolumeSize } = useVolumeTypes(cloudProfile)
        const machineType = {}
        const volumeType = ref({})
        expect(() => {
          const minSize = useMinimumVolumeSize(machineType, volumeType)
          // Access the computed value to trigger validation
          minSize.value // eslint-disable-line no-unused-expressions
        }).toThrow('machineType must be a ref!')
      })

      it('should throw error when volumeType is not a ref', () => {
        const { useMinimumVolumeSize } = useVolumeTypes(cloudProfile)
        const machineType = ref({})
        const volumeType = {}
        expect(() => {
          const minSize = useMinimumVolumeSize(machineType, volumeType)
          // Access the computed value to trigger validation
          minSize.value // eslint-disable-line no-unused-expressions
        }).toThrow('volumeType must be a ref!')
      })
    })

    it('should throw error when cloudProfile is not a ref', () => {
      const cloudProfileValue = {
        metadata: { name: 'test' },
      }
      expect(() => {
        useVolumeTypes(cloudProfileValue)
      }).toThrow('cloudProfile must be a ref!')
    })
  })
})
