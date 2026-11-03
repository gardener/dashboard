//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import { ref } from 'vue'

import { useMetalConstraints } from '@/providers/infra/metal/cloudProfile.js'

describe('Metal CloudProfile constraints', () => {
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

    describe('#useMetalPartitionIDs', () => {
      it('should return partition IDs (zones) by region from cloud profile', () => {
        const { useMetalPartitionIDs } = useMetalConstraints(cloudProfile)

        const region = ref('region1')
        let partitionIDs = useMetalPartitionIDs(region)
        expect(partitionIDs.value).toHaveLength(2)
        expect(partitionIDs.value[0]).toBe('partition1')
        expect(partitionIDs.value[1]).toBe('partition2')

        region.value = 'region2'
        partitionIDs = useMetalPartitionIDs(region)
        expect(partitionIDs.value).toHaveLength(1)
        expect(partitionIDs.value[0]).toBe('partition3')
      })

      it('should return undefined for non-metal cloud profile', () => {
        cloudProfile.value.spec.type = 'aws'
        const { useMetalPartitionIDs } = useMetalConstraints(cloudProfile)

        const region = ref('region1')
        const partitionIDs = useMetalPartitionIDs(region)
        expect(partitionIDs.value).toBeUndefined()
      })
    })

    describe('#useMetalFirewallSizes', () => {
      it('should return firewall sizes (machine types) by region from cloud profile', () => {
        const { useMetalFirewallSizes } = useMetalConstraints(cloudProfile)

        const region = ref('region1')
        const firewallSizes = useMetalFirewallSizes(region)
        expect(firewallSizes.value).toHaveLength(2)
        expect(firewallSizes.value[0].name).toBe('machineType1')
        expect(firewallSizes.value[1].name).toBe('machineType2')
      })

      it('should return undefined for non-metal cloud profile', () => {
        cloudProfile.value.spec.type = 'azure'
        const { useMetalFirewallSizes } = useMetalConstraints(cloudProfile)

        const region = ref('region1')
        const firewallSizes = useMetalFirewallSizes(region)
        expect(firewallSizes.value).toBeUndefined()
      })
    })

    describe('#metalFirewallImages', () => {
      it('should return firewall images from cloud profile', () => {
        const { metalFirewallImages } = useMetalConstraints(cloudProfile)

        expect(metalFirewallImages.value).toHaveLength(2)
        expect(metalFirewallImages.value[0]).toEqual({ name: 'firewall-image-1', version: '1.0.0' })
        expect(metalFirewallImages.value[1]).toEqual({ name: 'firewall-image-2', version: '2.0.0' })
      })

      it('should return undefined for non-metal cloud profile', () => {
        cloudProfile.value.spec.type = 'gcp'
        const { metalFirewallImages } = useMetalConstraints(cloudProfile)

        expect(metalFirewallImages.value).toBeUndefined()
      })
    })

    describe('#useMetalFirewallNetworks', () => {
      it('should return firewall networks by partition ID from cloud profile', () => {
        const { useMetalFirewallNetworks } = useMetalConstraints(cloudProfile)

        const partitionID = ref('partition1')
        let networks = useMetalFirewallNetworks(partitionID)
        expect(networks.value).toHaveLength(2)
        expect(networks.value[0]).toEqual({ key: 'network1', value: '10.0.0.0/8', text: 'network1 [10.0.0.0/8]' })
        expect(networks.value[1]).toEqual({ key: 'network2', value: '192.168.0.0/16', text: 'network2 [192.168.0.0/16]' })

        partitionID.value = 'partition2'
        networks = useMetalFirewallNetworks(partitionID)
        expect(networks.value).toHaveLength(1)
        expect(networks.value[0]).toEqual({ key: 'network3', value: '172.16.0.0/12', text: 'network3 [172.16.0.0/12]' })
      })

      it('should return undefined for non-metal cloud profile', () => {
        cloudProfile.value.spec.type = 'openstack'
        const { useMetalFirewallNetworks } = useMetalConstraints(cloudProfile)

        const networks = useMetalFirewallNetworks(ref('partition1'))
        expect(networks.value).toBeUndefined()
      })
    })
  })
})
