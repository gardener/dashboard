//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import { ref } from 'vue'

import { useRegions } from '@/composables/useCloudProfile/useRegions'

import { createMetalInfrastructureDetailsContext } from '@/providers/infra/metal/useShootInfrastructureDetails'

describe('Metal Shoot infrastructure details', () => {
  it('owns field access, region defaults, and partition-dependent resets', () => {
    const manifest = ref({
      spec: {
        provider: {
          infrastructureConfig: {
            projectID: 'old-project',
          },
        },
      },
    })
    const region = ref('region-1')
    const cloudProfile = ref({
      spec: {
        type: 'metal',
        machineTypes: [
          { name: 'size-1' },
          { name: 'size-2' },
        ],
        regions: [{
          name: 'region-1',
          zones: [
            { name: 'partition-1' },
            { name: 'partition-2' },
          ],
        }],
        providerConfig: {
          firewallImages: ['image-1', 'image-2'],
          firewallNetworks: {
            'partition-1': {
              internet: '0.0.0.0/0',
              private: '10.0.0.0/8',
            },
            'partition-2': {
              private: '10.0.0.0/8',
            },
          },
        },
      },
    })
    const { useZones } = useRegions(cloudProfile)
    const context = createMetalInfrastructureDetailsContext({
      manifest,
      region,
      cloudProfile,
      useZones,
    })

    context.resetRegionDependentValues()
    expect(context.partitionID.value).toBe('partition-1')
    expect(context.firewallSize.value).toBe('size-1')
    expect(context.firewallNetworks.value).toEqual(['0.0.0.0/0'])

    context.resetCloudProfileDependentValues()
    expect(context.projectID.value).toBeUndefined()
    expect(context.firewallImage.value).toBe('image-1')

    context.partitionID.value = 'partition-2'
    expect(context.firewallSize.value).toBe('size-1')
    expect(context.firewallNetworks.value).toBeUndefined()
  })
})
