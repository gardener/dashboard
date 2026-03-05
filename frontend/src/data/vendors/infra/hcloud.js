//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

export default {
  name: 'hcloud',
  displayName: 'Hetzner Cloud',
  weight: 800,
  icon: 'hcloud.svg',
  shoot: {
    templates: {
      provider: {
        type: 'hcloud',
        infrastructureConfig: {
          apiVersion: 'hcloud.provider.extensions.gardener.cloud/v1alpha1',
          kind: 'InfrastructureConfig',
          networks: {
            workers: '__DEFAULT_WORKER_CIDR__',
          },
        },
        controlPlaneConfig: {
          apiVersion: 'hcloud.provider.extensions.gardener.cloud/v1alpha1',
          kind: 'ControlPlaneConfig',
        },
      },
      networking: {
        nodes: '__DEFAULT_WORKER_CIDR__',
      },
    },
    controlPlane: {
      zoneStrategy: 'worker-zones',
    },
  },
  secret: {
    fields: [
      {
        key: 'hcloudToken',
        label: 'Hetzner Cloud Token',
        type: 'text',
        validators: {
          required: {
            type: 'required',
          },
        },
      },
    ],
    help: `
      <p>
        Before you can provision and access a Kubernetes cluster on Hetzner Cloud, you need to add a Hetzner Cloud token.
        The Gardener needs these credentials to provision and operate Hetzner Cloud infrastructure for your Kubernetes cluster.
      </p>
      <p>
        Please read the
        <a href="https://www.hetzner.com/cloud">Hetzner Cloud Documentation</a>.
      </p>
      `,
  },
}
