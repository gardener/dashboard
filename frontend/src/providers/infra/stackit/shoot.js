//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

// STACKIT Shoot defaults.
export function createShootSpec ({ providerType, nodesCIDR }) {
  return {
    provider: {
      type: providerType,
      infrastructureConfig: {
        apiVersion: 'stackit.provider.extensions.gardener.cloud/v1alpha1',
        kind: 'InfrastructureConfig',
        networks: {
          workers: nodesCIDR,
        },
      },
      controlPlaneConfig: {
        apiVersion: 'stackit.provider.extensions.gardener.cloud/v1alpha1',
        kind: 'ControlPlaneConfig',
      },
    },
    networking: {
      nodes: nodesCIDR,
    },
  }
}
