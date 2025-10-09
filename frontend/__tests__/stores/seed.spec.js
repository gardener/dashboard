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
          taints: [], // No taints = not protected
          settings: {
            scheduling: {
              visible: true,
            },
          },
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
          taints: [], // No taints = not protected
          settings: {
            scheduling: {
              visible: true,
            },
          },
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
          taints: [], // No taints = not protected
          settings: {
            scheduling: {
              visible: true,
            },
          },
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
          taints: [], // No taints = not protected
          settings: {
            scheduling: {
              visible: true,
            },
          },
        },
      },
    ]
    const mockProject = {
      spec: {
        tolerations: {
          defaults: [
            {
              key: 'example-key',
            },
          ],
        },
      },
    }

    beforeEach(() => {
      setActivePinia(createPinia())
      seedStore = useSeedStore()
      seedStore.list = mockSeeds
    })

    describe('#seedsForCloudProfile', () => {
      it('should return seeds matching cloud profile provider type', () => {
        const cloudProfile = {
          metadata: {
            name: 'aws-profile',
            providerType: 'aws',
          },
          spec: {
            type: 'aws',
          },
        }

        const matchingSeeds = seedStore.seedsForCloudProfileByProject(cloudProfile, mockProject)
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
          spec: {
            type: 'aws',
            seedSelector: {
              matchLabels: {
                environment: 'production',
              },
            },
          },
        }

        const matchingSeeds = seedStore.seedsForCloudProfileByProject(cloudProfile, mockProject)
        expect(matchingSeeds).toHaveLength(1)
        expect(matchingSeeds[0].metadata.name).toBe('aws-seed-1')
      })

      it('should return seeds matching cloud profile with multiple provider types', () => {
        const cloudProfile = {
          metadata: {
            name: 'multi-provider-profile',
            providerType: 'aws',
          },
          spec: {
            type: 'aws',
            seedSelector: {
              providerTypes: ['aws', 'gcp'],
            },
          },
        }

        const matchingSeeds = seedStore.seedsForCloudProfileByProject(cloudProfile, mockProject)
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
          spec: {
            type: 'aws',
            seedSelector: {
              providerTypes: ['*'],
            },
          },
        }

        const matchingSeeds = seedStore.seedsForCloudProfileByProject(cloudProfile, mockProject)
        expect(matchingSeeds).toHaveLength(4) // All seeds should match
      })

      it('should return seeds matching complex label selector', () => {
        const cloudProfile = {
          metadata: {
            name: 'complex-selector-profile',
            providerType: 'aws',
          },
          spec: {
            type: 'aws',
            seedSelector: {
              providerTypes: ['*'],
              matchLabels: {
                environment: 'production',
              },
            },
          },
        }

        const matchingSeeds = seedStore.seedsForCloudProfileByProject(cloudProfile, mockProject)
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
          spec: {
            type: 'openstack',
          },
        }

        const matchingSeeds = seedStore.seedsForCloudProfileByProject(cloudProfile, mockProject)
        expect(matchingSeeds).toHaveLength(0)
      })

      it('should return empty array when cloud profile is null', () => {
        const matchingSeeds = seedStore.seedsForCloudProfileByProject(null)
        expect(matchingSeeds).toHaveLength(0)
      })

      it('should return empty array when seed list is null', () => {
        seedStore.list = null
        const cloudProfile = {
          metadata: {
            name: 'aws-profile',
            providerType: 'aws',
          },
          spec: {
            type: 'aws',
          },
        }

        const matchingSeeds = seedStore.seedsForCloudProfileByProject(cloudProfile, mockProject)
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
              taints: [], // No taints = not protected
              settings: {
                scheduling: {
                  visible: true,
                },
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
          spec: {
            type: 'aws',
            seedSelector: {
              matchLabels: {
                environment: 'production',
              },
            },
          },
        }

        const matchingSeeds = seedStore.seedsForCloudProfileByProject(cloudProfile, mockProject)
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
              taints: [], // No taints = not protected
              settings: {
                scheduling: {
                  visible: true,
                },
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
          spec: {
            type: 'aws',
          },
        }

        const matchingSeeds = seedStore.seedsForCloudProfileByProject(cloudProfile, mockProject)
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

    describe('#taints and tolerations matching', () => {
      it('should return seeds when taints and tolerations match', () => {
        const seedsWithTaints = [
          {
            metadata: {
              name: 'aws-seed-with-taints',
            },
            spec: {
              provider: {
                type: 'aws',
              },
              region: 'eu-west-1',
              taints: [
                {
                  key: 'example-key',
                },
              ],
              settings: {
                scheduling: {
                  visible: true,
                },
              },
            },
          },
        ]
        seedStore.list = seedsWithTaints

        const projectWithTolerations = {
          spec: {
            tolerations: {
              defaults: [
                {
                  key: 'example-key',
                },
              ],
            },
          },
        }

        const cloudProfile = {
          metadata: {
            name: 'aws-profile',
            providerType: 'aws',
          },
          spec: {
            type: 'aws',
          },
        }

        const matchingSeeds = seedStore.seedsForCloudProfileByProject(cloudProfile, projectWithTolerations)
        expect(matchingSeeds).toHaveLength(1)
        expect(matchingSeeds[0].metadata.name).toBe('aws-seed-with-taints')
      })

      it('should not return seeds when taints and tolerations do not match', () => {
        const seedsWithTaints = [
          {
            metadata: {
              name: 'aws-seed-with-different-taints',
            },
            spec: {
              provider: {
                type: 'aws',
              },
              region: 'eu-west-1',
              taints: [
                {
                  key: 'different-key',
                },
              ],
              settings: {
                scheduling: {
                  visible: true,
                },
              },
            },
          },
        ]
        seedStore.list = seedsWithTaints

        const projectWithDifferentTolerations = {
          spec: {
            tolerations: {
              defaults: [
                {
                  key: 'example-key',
                },
              ],
            },
          },
        }

        const cloudProfile = {
          metadata: {
            name: 'aws-profile',
            providerType: 'aws',
          },
          spec: {
            type: 'aws',
          },
        }

        const matchingSeeds = seedStore.seedsForCloudProfileByProject(cloudProfile, projectWithDifferentTolerations)
        expect(matchingSeeds).toHaveLength(0)
      })

      it('should not return seeds when there are taints but no tolerations', () => {
        const seedsWithTaints = [
          {
            metadata: {
              name: 'aws-seed-with-taints-no-tolerations',
            },
            spec: {
              provider: {
                type: 'aws',
              },
              region: 'eu-west-1',
              taints: [
                {
                  key: 'example-key',
                },
              ],
              settings: {
                scheduling: {
                  visible: true,
                },
              },
            },
          },
        ]
        seedStore.list = seedsWithTaints

        const projectWithoutTolerations = {
          spec: {
            tolerations: {
              defaults: [],
            },
          },
        }

        const cloudProfile = {
          metadata: {
            name: 'aws-profile',
            providerType: 'aws',
          },
          spec: {
            type: 'aws',
          },
        }

        const matchingSeeds = seedStore.seedsForCloudProfileByProject(cloudProfile, projectWithoutTolerations)
        expect(matchingSeeds).toHaveLength(0)
      })

      it('should return seeds when there are no taints but tolerations exist', () => {
        const seedsWithoutTaints = [
          {
            metadata: {
              name: 'aws-seed-without-taints',
            },
            spec: {
              provider: {
                type: 'aws',
              },
              region: 'eu-west-1',
              taints: [],
              settings: {
                scheduling: {
                  visible: true,
                },
              },
            },
          },
        ]
        seedStore.list = seedsWithoutTaints

        const projectWithTolerations = {
          spec: {
            tolerations: {
              defaults: [
                {
                  key: 'example-key',
                },
              ],
            },
          },
        }

        const cloudProfile = {
          metadata: {
            name: 'aws-profile',
            providerType: 'aws',
          },
          spec: {
            type: 'aws',
          },
        }

        const matchingSeeds = seedStore.seedsForCloudProfileByProject(cloudProfile, projectWithTolerations)
        expect(matchingSeeds).toHaveLength(1)
        expect(matchingSeeds[0].metadata.name).toBe('aws-seed-without-taints')
      })
    })
  })
})
