//
// SPDX-FileCopyrightText: 2025 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import { ref } from 'vue'

import { useMetalConstraints } from '@/composables/useCloudProfile/useMetalConstraints.js'
import { useRegions } from '@/composables/useCloudProfile/useRegions.js'

describe('composables', () => {
  describe('useMetalConstraints', () => {
    const machineTypes = [
      {
        name: 'machineType1',
      },
      {
        name: 'machineType2',
      },
    ]

    const firewallImages = [
      {
        name: 'firewall-image-1',
        version: '1.0.0',
      },
      {
        name: 'firewall-image-2',
        version: '2.0.0',
      },
    ]

    const firewallNetworks = {
      partition1: {
        network1: '10.0.0.0/8',
        network2: '192.168.0.0/16',
      },
      partition2: {
        network3: '172.16.0.0/12',
      },
    }

    let cloudProfile

    beforeEach(() => {
      cloudProfile = ref({
        metadata: {
          name: 'foo',
        },
        kind: 'CloudProfile',
        spec: {
          type: 'metal',
          machineTypes,
          regions: [
            {
              name: 'region1',
              zones: [
                { name: 'partition1' },
                { name: 'partition2' },
              ],
            },
            {
              name: 'region2',
              zones: [
                { name: 'partition3' },
              ],
            },
          ],
          providerConfig: {
            firewallImages,
            firewallNetworks,
          },
        },
      })
    })

    describe('#usePartitionIDsByRegion', () => {
      it('should return partition IDs (zones) by region from cloud profile', () => {
        const { useZonesByRegion } = useRegions(cloudProfile)
        const { usePartitionIDsByRegion } = useMetalConstraints(cloudProfile, useZonesByRegion)

        const region = ref('region1')
        let partitionIDs = usePartitionIDsByRegion(region).value
        expect(partitionIDs).toHaveLength(2)
        expect(partitionIDs[0]).toBe('partition1')
        expect(partitionIDs[1]).toBe('partition2')

        region.value = 'region2'
        partitionIDs = usePartitionIDsByRegion(region).value
        expect(partitionIDs).toHaveLength(1)
        expect(partitionIDs[0]).toBe('partition3')
      })

      it('should return undefined for non-metal cloud profile', () => {
        cloudProfile.value.spec.type = 'aws'
        const { useZonesByRegion } = useRegions(cloudProfile)
        const { usePartitionIDsByRegion } = useMetalConstraints(cloudProfile, useZonesByRegion)

        const region = ref('region1')
        const partitionIDs = usePartitionIDsByRegion(region).value
        expect(partitionIDs).toBeUndefined()
      })
    })

    describe('#useFirewallSizesByRegion', () => {
      it('should return firewall sizes (machine types) by region from cloud profile', () => {
        const { useZonesByRegion } = useRegions(cloudProfile)
        const { useFirewallSizesByRegion } = useMetalConstraints(cloudProfile, useZonesByRegion)

        const region = ref('region1')
        const firewallSizes = useFirewallSizesByRegion(region).value
        expect(firewallSizes).toHaveLength(2)
        expect(firewallSizes[0].name).toBe('machineType1')
        expect(firewallSizes[1].name).toBe('machineType2')
      })

      it('should return undefined for non-metal cloud profile', () => {
        cloudProfile.value.spec.type = 'azure'
        const { useZonesByRegion } = useRegions(cloudProfile)
        const { useFirewallSizesByRegion } = useMetalConstraints(cloudProfile, useZonesByRegion)

        const region = ref('region1')
        const firewallSizes = useFirewallSizesByRegion(region).value
        expect(firewallSizes).toBeUndefined()
      })
    })

    describe('#firewallImages', () => {
      it('should return firewall images from cloud profile', () => {
        const { useZonesByRegion } = useRegions(cloudProfile)
        const { firewallImages: images } = useMetalConstraints(cloudProfile, useZonesByRegion)

        expect(images.value).toHaveLength(2)
        expect(images.value[0]).toEqual({ name: 'firewall-image-1', version: '1.0.0' })
        expect(images.value[1]).toEqual({ name: 'firewall-image-2', version: '2.0.0' })
      })
    })

    describe('#useFirewallNetworksByPartitionId', () => {
      it('should return firewall networks by partition ID from cloud profile', () => {
        const { useZonesByRegion } = useRegions(cloudProfile)
        const { useFirewallNetworksByPartitionId } = useMetalConstraints(cloudProfile, useZonesByRegion)

        const partitionID = ref('partition1')
        let networks = useFirewallNetworksByPartitionId(partitionID).value
        expect(networks).toHaveLength(2)
        expect(networks[0]).toEqual({ key: 'network1', value: '10.0.0.0/8', text: 'network1 [10.0.0.0/8]' })
        expect(networks[1]).toEqual({ key: 'network2', value: '192.168.0.0/16', text: 'network2 [192.168.0.0/16]' })

        partitionID.value = 'partition2'
        networks = useFirewallNetworksByPartitionId(partitionID).value
        expect(networks).toHaveLength(1)
        expect(networks[0]).toEqual({ key: 'network3', value: '172.16.0.0/12', text: 'network3 [172.16.0.0/12]' })
      })
    })
  })
})
