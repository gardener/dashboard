//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

import flatMap from 'lodash/flatMap'
import includes from 'lodash/includes'
import sample from 'lodash/sample'
import uniq from 'lodash/uniq'

export function createShootSpec ({ providerType, nodesCIDR }) {
  return {
    provider: {
      type: providerType,
      infrastructureConfig: {
        apiVersion: 'hcloud.provider.extensions.gardener.cloud/v1alpha1',
        kind: 'InfrastructureConfig',
        networks: {
          workers: nodesCIDR,
        },
      },
      controlPlaneConfig: {
        apiVersion: 'hcloud.provider.extensions.gardener.cloud/v1alpha1',
        kind: 'ControlPlaneConfig',
      },
    },
    networking: {
      nodes: nodesCIDR,
    },
  }
}

// HCloud requires the control plane zone to match one of the worker zones.
export function resolveControlPlaneZone ({ workers, currentZone }) {
  const workerZones = uniq(flatMap(workers, 'zones'))
  if (includes(workerZones, currentZone)) {
    return currentZone
  }
  return sample(workerZones)
}
