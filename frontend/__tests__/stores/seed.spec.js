//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  setActivePinia,
  createPinia,
} from 'pinia'

import { useSeedStore } from '@/store/seed'

describe('stores', () => {
  describe('seed', () => {
    let seedStore

    const mockSeeds = [
      {
        metadata: {
          name: 'aws-seed-1',
          labels: {
            'seed.gardener.cloud/eu-west-1': 'true',
            environment: 'production',
          },
        },
        spec: {
          provider: {
            type: 'aws',
          },
          region: 'eu-west-1',
        },
      },
      {
        metadata: {
          name: 'aws-seed-2',
          labels: {
            'seed.gardener.cloud/us-east-1': 'true',
            environment: 'staging',
          },
        },
        spec: {
          provider: {
            type: 'aws',
          },
          region: 'us-east-1',
        },
      },
      {
        metadata: {
          name: 'gcp-seed-1',
          labels: {
            'seed.gardener.cloud/europe-west1': 'true',
            environment: 'production',
          },
        },
        spec: {
          provider: {
            type: 'gcp',
          },
          region: 'europe-west1',
        },
      },
      {
        metadata: {
          name: 'azure-seed-1',
          labels: {
            'seed.gardener.cloud/westeurope': 'true',
            environment: 'development',
          },
        },
        spec: {
          provider: {
            type: 'azure',
          },
          region: 'westeurope',
        },
      },
    ]

    beforeEach(() => {
      setActivePinia(createPinia())
      seedStore = useSeedStore()
      // Mock the seed list
      seedStore.list = mockSeeds
    })

    describe('#seedsForCloudProfile', () => {
      it('should return seeds matching cloud profile provider type', () => {
        const cloudProfile = {
          metadata: {
            name: 'aws-profile',
            providerType: 'aws',
          },
          data: {
            type: 'aws',
          },
        }

        const matchingSeeds = seedStore.seedsForCloudProfile(cloudProfile)
        expect(matchingSeeds).toHaveLength(2)
        expect(matchingSeeds[0].metadata.name).toBe('aws-seed-1')
        expect(matchingSeeds[1].metadata.name).toBe('aws-seed-2')
      })

      it('should return seeds matching cloud profile with label selector', () => {
        const cloudProfile = {
          metadata: {
            name: 'aws-production-profile',
            providerType: 'aws',
          },
          data: {
            type: 'aws',
            seedSelector: {
              matchLabels: {
                environment: 'production',
              },
            },
          },
        }

        const matchingSeeds = seedStore.seedsForCloudProfile(cloudProfile)
        expect(matchingSeeds).toHaveLength(1)
        expect(matchingSeeds[0].metadata.name).toBe('aws-seed-1')
      })

      it('should return seeds matching cloud profile with multiple provider types', () => {
        const cloudProfile = {
          metadata: {
            name: 'multi-provider-profile',
            providerType: 'aws',
          },
          data: {
            type: 'aws',
            seedSelector: {
              providerTypes: ['aws', 'gcp'],
            },
          },
        }

        const matchingSeeds = seedStore.seedsForCloudProfile(cloudProfile)
        expect(matchingSeeds).toHaveLength(3)
        expect(matchingSeeds.map(s => s.metadata.name)).toEqual(
          expect.arrayContaining(['aws-seed-1', 'aws-seed-2', 'gcp-seed-1']),
        )
      })

      it('should return seeds matching wildcard provider type', () => {
        const cloudProfile = {
          metadata: {
            name: 'wildcard-profile',
            providerType: 'aws',
          },
          data: {
            type: 'aws',
            seedSelector: {
              providerTypes: ['*'],
            },
          },
        }

        const matchingSeeds = seedStore.seedsForCloudProfile(cloudProfile)
        expect(matchingSeeds).toHaveLength(4) // All seeds should match
      })

      it('should return seeds matching complex label selector', () => {
        const cloudProfile = {
          metadata: {
            name: 'complex-selector-profile',
            providerType: 'aws',
          },
          data: {
            type: 'aws',
            seedSelector: {
              providerTypes: ['*'],
              matchLabels: {
                environment: 'production',
              },
            },
          },
        }

        const matchingSeeds = seedStore.seedsForCloudProfile(cloudProfile)
        expect(matchingSeeds).toHaveLength(2)
        expect(matchingSeeds.map(s => s.metadata.name)).toEqual(
          expect.arrayContaining(['aws-seed-1', 'gcp-seed-1']),
        )
      })

      it('should return empty array when no seeds match', () => {
        const cloudProfile = {
          metadata: {
            name: 'no-match-profile',
            providerType: 'openstack',
          },
          data: {
            type: 'openstack',
          },
        }

        const matchingSeeds = seedStore.seedsForCloudProfile(cloudProfile)
        expect(matchingSeeds).toHaveLength(0)
      })

      it('should return empty array when cloud profile is null', () => {
        const matchingSeeds = seedStore.seedsForCloudProfile(null)
        expect(matchingSeeds).toHaveLength(0)
      })

      it('should return empty array when seed list is null', () => {
        seedStore.list = null
        const cloudProfile = {
          metadata: {
            name: 'aws-profile',
            providerType: 'aws',
          },
          data: {
            type: 'aws',
          },
        }

        const matchingSeeds = seedStore.seedsForCloudProfile(cloudProfile)
        expect(matchingSeeds).toHaveLength(0)
      })

      it('should handle seeds without labels gracefully', () => {
        const seedsWithoutLabels = [
          {
            metadata: {
              name: 'aws-seed-no-labels',
            },
            spec: {
              provider: {
                type: 'aws',
              },
            },
          },
        ]
        seedStore.list = seedsWithoutLabels

        const cloudProfile = {
          metadata: {
            name: 'aws-profile-with-labels',
            providerType: 'aws',
          },
          data: {
            type: 'aws',
            seedSelector: {
              matchLabels: {
                environment: 'production',
              },
            },
          },
        }

        const matchingSeeds = seedStore.seedsForCloudProfile(cloudProfile)
        expect(matchingSeeds).toHaveLength(0) // Should not match due to missing labels
      })

      it('should match seeds without label selector when no matchLabels specified', () => {
        const seedsWithoutLabels = [
          {
            metadata: {
              name: 'aws-seed-no-labels',
            },
            spec: {
              provider: {
                type: 'aws',
              },
            },
          },
        ]
        seedStore.list = seedsWithoutLabels

        const cloudProfile = {
          metadata: {
            name: 'aws-profile-no-selector',
            providerType: 'aws',
          },
          data: {
            type: 'aws',
          },
        }

        const matchingSeeds = seedStore.seedsForCloudProfile(cloudProfile)
        expect(matchingSeeds).toHaveLength(1)
        expect(matchingSeeds[0].metadata.name).toBe('aws-seed-no-labels')
      })
    })

    describe('#seedByName', () => {
      it('should return seed by name', () => {
        const seed = seedStore.seedByName('aws-seed-1')
        expect(seed).toBeDefined()
        expect(seed.metadata.name).toBe('aws-seed-1')
      })

      it('should return undefined for non-existent seed', () => {
        const seed = seedStore.seedByName('non-existent-seed')
        expect(seed).toBeUndefined()
      })
    })
  })
})
