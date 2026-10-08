//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import { splitCIDR } from '@/providers/infra/common/zoneNetworking'

import map from 'lodash/map'

export function createShootSpec ({ providerType, nodesCIDR }) {
  return {
    provider: {
      type: providerType,
      infrastructureConfig: {
        apiVersion: 'alicloud.provider.extensions.gardener.cloud/v1alpha1',
        kind: 'InfrastructureConfig',
        networks: {
          vpc: {
            cidr: nodesCIDR,
          },
        },
      },
      controlPlaneConfig: {
        apiVersion: 'alicloud.provider.extensions.gardener.cloud/v1alpha1',
        kind: 'ControlPlaneConfig',
      },
    },
    networking: {
      nodes: nodesCIDR,
    },
  }
}

export function createZoneNetworks ({ workerCIDR, zoneCount }) {
  return map(splitCIDR(workerCIDR, zoneCount), workers => ({ workers }))
}
