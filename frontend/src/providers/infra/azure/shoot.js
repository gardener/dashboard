//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import { getZones } from '@/composables/helper'

import get from 'lodash/get'
import some from 'lodash/some'

export function createShootSpec ({ providerType, nodesCIDR }) {
  return {
    provider: {
      type: providerType,
      infrastructureConfig: {
        apiVersion: 'azure.provider.extensions.gardener.cloud/v1alpha1',
        kind: 'InfrastructureConfig',
        networks: {
          vnet: {
            cidr: nodesCIDR,
          },
          workers: nodesCIDR,
        },
        zoned: true,
      },
      controlPlaneConfig: {
        apiVersion: 'azure.provider.extensions.gardener.cloud/v1alpha1',
        kind: 'ControlPlaneConfig',
      },
    },
    networking: {
      nodes: nodesCIDR,
    },
  }
}

export function isZoned ({ manifest, isNewCluster }) {
  if (isNewCluster) {
    return true
  }
  return get(manifest, ['spec', 'provider', 'infrastructureConfig', 'zoned'], false)
}

export function isRegionSupported ({ cloudProfile, region }) {
  // Azure regions may not be zoned, so the dashboard must not offer them for Shoots.
  return some(getZones(cloudProfile, region))
}
