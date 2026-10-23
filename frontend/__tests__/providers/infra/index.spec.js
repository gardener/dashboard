//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import { getInfrastructureProviderExtension } from '@/providers/infra'
import infrastructureVendors from '@/data/vendors/infra'

describe('infrastructure provider registry', () => {
  const nodesCIDR = '10.250.0.0/16'

  describe('default Shoot specs', () => {
    it('preserves the defaults for every current infrastructure provider', () => {
      const providerTypes = infrastructureVendors
        .map(({ name }) => name)
        .sort()
      const specs = Object.fromEntries(providerTypes.map(providerType => {
        const extension = getInfrastructureProviderExtension(providerType)
        return [providerType, extension.createShootSpec({ providerType, nodesCIDR })]
      }))

      expect(specs).toMatchSnapshot()
    })

    it('uses the default extension for an unregistered provider', () => {
      const extension = getInfrastructureProviderExtension('unregistered')
      const cloudProfile = {
        spec: {
          regions: [
            { name: 'region-a' },
          ],
        },
      }

      expect(extension.createShootSpec({
        providerType: 'unregistered',
        nodesCIDR,
      })).toEqual({
        provider: {
          type: 'unregistered',
        },
        networking: {
          nodes: nodesCIDR,
        },
      })
      expect(extension.isZoned({})).toBe(true)
      expect(extension.resolveZoneNetworkWorkerCIDR({ defaultNodesCIDR: nodesCIDR })).toBe(nodesCIDR)
      expect(extension.isRegionSupported({ cloudProfile, region: 'region-a' })).toBe(true)
      expect(extension.isRegionSupported({ cloudProfile, region: 'region-b' })).toBe(false)
      expect(extension.createZoneNetworks).toBeUndefined()
      expect(extension.resolveControlPlaneZone).toBeUndefined()
    })
  })

  describe('zone networks', () => {
    it('creates AWS worker, public, and internal networks', () => {
      const { createZoneNetworks } = getInfrastructureProviderExtension('aws')

      expect(createZoneNetworks({ workerCIDR: nodesCIDR, zoneCount: 2 })).toEqual([
        {
          workers: '10.250.0.0/18',
          public: '10.250.64.0/19',
          internal: '10.250.96.0/19',
        },
        {
          workers: '10.250.128.0/18',
          public: '10.250.192.0/19',
          internal: '10.250.224.0/19',
        },
      ])
    })

    it('creates Alicloud worker networks', () => {
      const { createZoneNetworks } = getInfrastructureProviderExtension('alicloud')

      expect(createZoneNetworks({ workerCIDR: nodesCIDR, zoneCount: 2 })).toEqual([
        { workers: '10.250.0.0/17' },
        { workers: '10.250.128.0/17' },
      ])
    })

    it('creates GDCH CIDR networks', () => {
      const { createZoneNetworks } = getInfrastructureProviderExtension('gdch')

      expect(createZoneNetworks({ workerCIDR: nodesCIDR, zoneCount: 2 })).toEqual([
        { CIDR: '10.250.0.0/17' },
        { CIDR: '10.250.128.0/17' },
      ])
    })

    it.each([
      undefined,
      '10.',
      '10.0.0.0/33',
      '10.0.0.0/31',
    ])('does not create GDCH networks for invalid or incomplete CIDR %s', workerCIDR => {
      const { createZoneNetworks } = getInfrastructureProviderExtension('gdch')

      expect(createZoneNetworks({ workerCIDR, zoneCount: 3 })).toBeUndefined()
    })

    it('does not substitute the default node CIDR for GDCH zone networks', () => {
      const { resolveZoneNetworkWorkerCIDR } = getInfrastructureProviderExtension('gdch')

      expect(resolveZoneNetworkWorkerCIDR({
        nodesCIDR: undefined,
        defaultNodesCIDR: nodesCIDR,
      })).toBeUndefined()
    })
  })

  it('creates the AWS worker provider config', () => {
    const { createWorkerConfig } = getInfrastructureProviderExtension('aws')

    expect(createWorkerConfig()).toEqual({
      apiVersion: 'aws.provider.extensions.gardener.cloud/v1alpha1',
      kind: 'WorkerConfig',
    })
  })

  describe('zoned behavior', () => {
    const manifest = zoned => ({
      spec: {
        provider: {
          infrastructureConfig: {
            zoned,
          },
        },
      },
    })

    it('always treats new Azure Shoots as zoned', () => {
      const { isZoned } = getInfrastructureProviderExtension('azure')

      expect(isZoned({ manifest: manifest(false), isNewCluster: true })).toBe(true)
    })

    it('uses the infrastructure setting for existing Azure Shoots', () => {
      const { isZoned } = getInfrastructureProviderExtension('azure')

      expect(isZoned({ manifest: manifest(true), isNewCluster: false })).toBe(true)
      expect(isZoned({ manifest: manifest(false), isNewCluster: false })).toBe(false)
      expect(isZoned({ manifest: {}, isNewCluster: false })).toBe(false)
    })

    it.each(['metal', 'local'])('treats %s Shoots as non-zoned', providerType => {
      const { isZoned } = getInfrastructureProviderExtension(providerType)

      expect(isZoned({ manifest: {}, isNewCluster: true })).toBe(false)
    })
  })

  describe('region support', () => {
    const cloudProfile = {
      spec: {
        regions: [
          {
            name: 'zoned',
            zones: [{ name: '1' }],
          },
          {
            name: 'non-zoned',
            zones: [],
          },
        ],
      },
    }

    it('only supports zoned Azure regions', () => {
      const { isRegionSupported } = getInfrastructureProviderExtension('azure')

      expect(isRegionSupported({ cloudProfile, region: 'zoned' })).toBe(true)
      expect(isRegionSupported({ cloudProfile, region: 'non-zoned' })).toBe(false)
    })
  })

  describe('control-plane zone resolution', () => {
    const workers = [
      { zones: ['zone-a'] },
      { zones: ['zone-a'] },
    ]

    it.each(['gcp', 'hcloud'])('preserves or replaces the %s control-plane zone', providerType => {
      const { resolveControlPlaneZone } = getInfrastructureProviderExtension(providerType)

      expect(resolveControlPlaneZone({ workers, currentZone: 'zone-a' })).toBe('zone-a')
      expect(resolveControlPlaneZone({ workers, currentZone: 'zone-b' })).toBe('zone-a')
    })
  })
})
