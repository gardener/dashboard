//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import get from 'lodash/get'
import some from 'lodash/some'

// Fallback Shoot behavior for CloudProfile provider types without a registry entry.
export function createShootSpec ({ providerType, nodesCIDR }) {
  return {
    provider: {
      type: providerType,
    },
    networking: {
      nodes: nodesCIDR,
    },
  }
}

export function isZoned () {
  return true
}

export function resolveZoneNetworkWorkerCIDR ({ nodesCIDR, defaultNodesCIDR }) {
  return nodesCIDR ?? defaultNodesCIDR
}

export function isRegionSupported ({ cloudProfile, region }) {
  const regions = get(cloudProfile, ['spec', 'regions'], [])
  return some(regions, ['name', region])
}
