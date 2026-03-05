//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

export default {
  name: 'openstack',
  displayName: 'OpenStack',
  weight: 400,
  icon: 'openstack.svg',
  shoot: {
    templates: {
      provider: {
        type: 'openstack',
        infrastructureConfig: {
          apiVersion: 'openstack.provider.extensions.gardener.cloud/v1alpha1',
          kind: 'InfrastructureConfig',
          networks: {
            workers: '__DEFAULT_WORKER_CIDR__',
          },
        },
        controlPlaneConfig: {
          apiVersion: 'openstack.provider.extensions.gardener.cloud/v1alpha1',
          kind: 'ControlPlaneConfig',
        },
      },
      networking: {
        nodes: '__DEFAULT_WORKER_CIDR__',
      },
    },
  },
}
