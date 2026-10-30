//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import { splitCIDR } from '@/providers/infra/common/zoneNetworking'

import map from 'lodash/map'

export function createShootSpec ({ providerType }) {
  return {
    provider: {
      type: providerType,
      infrastructureConfig: {
        apiVersion: 'gdch.provider.extensions.gardener.gdc.goog/v1alpha1',
        kind: 'InfrastructureConfig',
        enableEgress: true,
        networks: {
          parentReference: {
            name: '',
            type: 'SingleSubnet',
          },
        },
      },
      controlPlaneConfig: {
        apiVersion: 'gdch.provider.extensions.gardener.gdc.goog/v1alpha1',
        kind: 'ControlPlaneConfig',
      },
    },
    networking: {
      type: 'calico',
      ipFamilies: ['IPv4'],
      providerConfig: {
        apiVersion: 'calico.networking.extensions.gardener.cloud/v1alpha1',
        kind: 'NetworkConfig',
        vxlan: {
          enabled: true,
        },
        overlay: {
          enabled: true,
        },
      },
    },
  }
}

export function createZoneNetworks ({ workerCIDR, zoneCount }) {
  try {
    return map(splitCIDR(workerCIDR, zoneCount), CIDR => ({ CIDR }))
  } catch {
    // workerCIDR comes from a free-text field and may be incomplete or too small to split
    return undefined
  }
}

export function resolveZoneNetworkWorkerCIDR ({ nodesCIDR }) {
  return nodesCIDR
}
