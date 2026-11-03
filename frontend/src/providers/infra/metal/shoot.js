//
// SPDX-FileCopyrightText: Contributors to the Gardener project
//
// SPDX-License-Identifier: Apache-2.0
//

export function createShootSpec ({ providerType }) {
  return {
    provider: {
      type: providerType,
      infrastructureConfig: {
        apiVersion: 'metal.provider.extensions.gardener.cloud/v1alpha1',
        kind: 'InfrastructureConfig',
      },
      controlPlaneConfig: {
        apiVersion: 'metal.provider.extensions.gardener.cloud/v1alpha1',
        kind: 'ControlPlaneConfig',
      },
    },
    networking: {
      type: 'calico',
      pods: '10.244.128.0/18',
      services: '10.244.192.0/18',
      providerConfig: {
        apiVersion: 'calico.networking.extensions.gardener.cloud/v1alpha1',
        kind: 'NetworkConfig',
        backend: 'vxlan',
        ipv4: {
          autoDetectionMethod: 'interface=lo',
          mode: 'Always',
          pool: 'vxlan',
        },
        typha: {
          enabled: true,
        },
      },
    },
    kubernetes: {
      kubeControllerManager: {
        nodeCIDRMaskSize: 23,
      },
      kubelet: {
        maxPods: 510,
      },
    },
  }
}

// Metal Shoots do not support zoned worker groups.
export function isZoned () {
  return false
}
