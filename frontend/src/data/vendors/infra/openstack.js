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
  secret: {
    details: [
      {
        label: 'Domain Name',
        key: 'domainName',
      },
      {
        label: 'Tenant Name',
        key: 'tenantName',
      },
    ],
    fields: [
      {
        key: 'authURL',
        label: 'Auth URL',
        type: 'text',
        validators: {
          required: {
            type: 'required',
          },
        },
      },
      {
        key: 'domainName',
        label: 'Domain Name',
        type: 'text',
        validators: {
          required: {
            type: 'required',
          },
        },
      },
      {
        key: 'tenantName',
        label: 'Project / Tenant Name',
        type: 'text',
        validators: {
          required: {
            type: 'required',
          },
        },
      },
      {
        key: 'applicationCredentialID',
        label: 'ID',
        type: 'text',
        validators: {
          required: {
            type: 'required',
          },
        },
      },
      {
        key: 'applicationCredentialName',
        label: 'Name',
        type: 'text',
        validators: {
          required: {
            type: 'required',
          },
        },
      },
      {
        key: 'applicationCredentialSecret',
        label: 'Secret',
        type: 'password',
        validators: {
          required: {
            type: 'required',
          },
        },
      },
      {
        key: 'username',
        label: 'Technical User',
        type: 'text',
        hint: 'Do not use personalized login credentials. Instead, use credentials of a technical user',
        validators: {
          required: {
            type: 'required',
          },
        },
      },
      {
        key: 'password',
        label: 'Password',
        type: 'password',
        hint: 'Do not use personalized login credentials. Instead, use credentials of a technical user',
        validators: {
          required: {
            type: 'required',
          },
        },
      },
    ],
  },
}
