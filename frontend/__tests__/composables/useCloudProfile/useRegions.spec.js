//
// SPDX-FileCopyrightText: 2025 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  setActivePinia,
  createPinia,
} from 'pinia'
import { ref } from 'vue'

import { useSeedStore } from '@/store/seed'

import { useRegions } from '@/composables/useCloudProfile/useRegions.js'

describe('composables', () => {
  describe('useRegions', () => {
    let seedStore

    const awsCloudProfile = {
      metadata: {
        name: 'aws',
      },
      kind: 'CloudProfile',
      spec: {
        type: 'aws',
        regions: [
          {
            name: 'eu-central-1',
            zones: [
              {
                name: 'eu-central-1a',
              },
              {
                name: 'eu-central-1b',
              },
              {
                name: 'eu-central-1c',
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
            ],
          },
        ],
      },
    }

    const azureCloudProfile = {
      metadata: {
        name: 'az',
      },
      kind: 'CloudProfile',
      spec: {
        type: 'azure',
        regions: [
          {
            name: 'westeurope',
            zones: [
              {
                name: '1',
              },
              {
                name: '2',
              },
              {
                name: '3',
              },
            ],
          },
          {
            name: 'eastus',
            zones: [],
          },
        ],
      },
    }

    const seeds = [
      {
        metadata: {
          name: 'aws-seed-eu',
        },
        spec: {
          provider: {
            type: 'aws',
            region: 'eu-central-1',
          },
          settings: {
            scheduling: {
              visible: true,
            },
          },
        },
      },
      {
        metadata: {
          name: 'aws-seed-us',
        },
        spec: {
          provider: {
            type: 'aws',
            region: 'us-east-1',
          },
          settings: {
            scheduling: {
              visible: true,
            },
          },
        },
      },
      {
        metadata: {
          name: 'azure-seed-west',
        },
        spec: {
          provider: {
            type: 'azure',
            region: 'westeurope',
          },
          settings: {
            scheduling: {
              visible: true,
            },
          },
        },
      },
    ]

    const project = {
      metadata: {
        name: 'test-project',
      },
      spec: {
        tolerations: {
          defaults: [],
        },
      },
    }

    beforeEach(() => {
      setActivePinia(createPinia())
      seedStore = useSeedStore()
      seedStore.list = seeds
    })

    describe('#useZones', () => {
      it('should return zones for valid AWS region', () => {
        const cloudProfile = ref(awsCloudProfile)
        const region = ref('eu-central-1')
        const { useZones } = useRegions(cloudProfile)
        const zones = useZones(region)
        expect(zones.value).toEqual(['eu-central-1a', 'eu-central-1b', 'eu-central-1c'])
      })

      it('should return zones for another AWS region', () => {
        const cloudProfile = ref(awsCloudProfile)
        const region = ref('us-east-1')
        const { useZones } = useRegions(cloudProfile)
        const zones = useZones(region)
        expect(zones.value).toEqual(['us-east-1a', 'us-east-1b'])
      })

      it('should return empty array for invalid region', () => {
        const cloudProfile = ref(awsCloudProfile)
        const region = ref('invalid-region')
        const { useZones } = useRegions(cloudProfile)
        const zones = useZones(region)
        expect(zones.value).toEqual([])
      })

      it('should return empty array when cloud profile is null', () => {
        const cloudProfile = ref(null)
        const region = ref('eu-central-1')
        const { useZones } = useRegions(cloudProfile)
        const zones = useZones(region)
        expect(zones.value).toEqual([])
      })

      it('should throw error if region is not a ref', () => {
        const cloudProfile = ref(awsCloudProfile)
        const { useZones } = useRegions(cloudProfile)
        expect(() => useZones('eu-central-1').value).toThrow('region must be a ref!')
      })
    })

    describe('#regionsWithSeed', () => {
      it('should return AWS regions that have seeds', () => {
        const cloudProfile = ref(awsCloudProfile)
        const projectRef = ref(project)
        const { useRegionsWithSeed } = useRegions(cloudProfile)
        const regions = useRegionsWithSeed(projectRef)
        expect(regions.value).toEqual(['eu-central-1', 'us-east-1'])
      })

      it('should return Azure regions that have seeds (excluding regions without zones)', () => {
        const cloudProfile = ref(azureCloudProfile)
        const projectRef = ref(project)
        const { useRegionsWithSeed } = useRegions(cloudProfile)
        const regions = useRegionsWithSeed(projectRef)
        expect(regions.value).toEqual(['westeurope'])
      })

      it('should return empty array when cloud profile is null', () => {
        const cloudProfile = ref(null)
        const projectRef = ref(project)
        const { useRegionsWithSeed } = useRegions(cloudProfile)
        const regions = useRegionsWithSeed(projectRef)
        expect(regions.value).toEqual([])
      })

      it('should return empty array when no seeds are available', () => {
        seedStore.list = []
        const cloudProfile = ref(awsCloudProfile)
        const projectRef = ref(project)
        const { useRegionsWithSeed } = useRegions(cloudProfile)
        const regions = useRegionsWithSeed(projectRef)
        expect(regions.value).toEqual([])
      })

      it('should throw error if project is not a ref', () => {
        const cloudProfile = ref(awsCloudProfile)
        const { useRegionsWithSeed } = useRegions(cloudProfile)
        expect(() => useRegionsWithSeed(project).value).toThrow('project must be a ref!')
      })
    })

    describe('#regionsWithoutSeed', () => {
      it('should return AWS regions without seeds', () => {
        // Remove us-east-1 seed
        seedStore.list = seeds.filter(seed => seed.spec.provider.region !== 'us-east-1')
        const cloudProfile = ref(awsCloudProfile)
        const projectRef = ref(project)
        const { useRegionsWithoutSeed } = useRegions(cloudProfile)
        const regions = useRegionsWithoutSeed(projectRef)
        expect(regions.value).toEqual(['us-east-1'])
      })

      it('should return empty array when all regions have seeds', () => {
        const cloudProfile = ref(awsCloudProfile)
        const projectRef = ref(project)
        const { useRegionsWithoutSeed } = useRegions(cloudProfile)
        const regions = useRegionsWithoutSeed(projectRef)
        expect(regions.value).toEqual([])
      })

      it('should return all regions when no seeds are available', () => {
        seedStore.list = []
        const cloudProfile = ref(awsCloudProfile)
        const projectRef = ref(project)
        const { useRegionsWithoutSeed } = useRegions(cloudProfile)
        const regions = useRegionsWithoutSeed(projectRef)
        expect(regions.value).toEqual(['eu-central-1', 'us-east-1'])
      })

      it('should exclude Azure regions without zones', () => {
        seedStore.list = []
        const cloudProfile = ref(azureCloudProfile)
        const projectRef = ref(project)
        const { useRegionsWithoutSeed } = useRegions(cloudProfile)
        const regions = useRegionsWithoutSeed(projectRef)
        // eastus has no zones, so it should be excluded
        expect(regions.value).toEqual(['westeurope'])
      })

      it('should return empty array when cloud profile is null', () => {
        const cloudProfile = ref(null)
        const projectRef = ref(project)
        const { useRegionsWithoutSeed } = useRegions(cloudProfile)
        const regions = useRegionsWithoutSeed(projectRef)
        expect(regions.value).toEqual([])
      })

      it('should throw error if project is not a ref', () => {
        const cloudProfile = ref(awsCloudProfile)
        const { useRegionsWithoutSeed } = useRegions(cloudProfile)
        expect(() => useRegionsWithoutSeed(project).value).toThrow('project must be a ref!')
      })
    })

    describe('error handling', () => {
      it('should throw error if cloudProfile is not a ref', () => {
        expect(() => useRegions(awsCloudProfile)).toThrow('cloudProfile must be a ref!')
      })
    })
  })
})
