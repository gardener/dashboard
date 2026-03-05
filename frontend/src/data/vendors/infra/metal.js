//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

export default {
  name: 'metal',
  displayName: 'Metal',
  weight: 900,
  icon: 'metal.svg',
  shoot: {
    templates: {
      provider: {
        type: 'metal',
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
    },
  },
  secret: {
    fields: [
      {
        key: 'metalAPIURL',
        label: 'API URL',
        type: 'text',
        validators: {
          required: {
            type: 'required',
          },
          url: {
            type: 'url',
          },
        },
      },
      {
        key: 'metalAPIHMac',
        label: 'API HMAC',
        type: 'password',
        validators: {
          required: {
            type: 'required',
          },
        },
      },
    ],
    help: `
      <p>
        Before you can provision and access a Kubernetes cluster on Metal Stack, you need to provide HMAC credentials and the endpoint of your Metal API.
        The Gardener needs the credentials to provision and operate the Metal Stack infrastructure for your Kubernetes cluster.
      </p>
      `,
  },
}
