//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

export default {
  name: 'azure',
  displayName: 'Azure',
  weight: 200,
  icon: 'azure.svg',
  shoot: {
    templates: {
      provider: {
        type: 'azure',
        infrastructureConfig: {
          apiVersion: 'azure.provider.extensions.gardener.cloud/v1alpha1',
          kind: 'InfrastructureConfig',
          networks: {
            vnet: {
              cidr: '__DEFAULT_WORKER_CIDR__',
            },
            workers: '__DEFAULT_WORKER_CIDR__',
          },
          zoned: true,
        },
        controlPlaneConfig: {
          apiVersion: 'azure.provider.extensions.gardener.cloud/v1alpha1',
          kind: 'ControlPlaneConfig',
        },
      },
      networking: {
        nodes: '__DEFAULT_WORKER_CIDR__',
      },
    },
  },
  secret: {
    fields: [
      {
        key: 'clientId',
        label: 'Client Id',
        type: 'text',
        validators: {
          required: {
            type: 'required',
          },
          guid: {
            type: 'guid',
          },
        },
      },
      {
        key: 'clientSecret',
        label: 'Client Secret',
        type: 'password',
        validators: {
          required: {
            type: 'required',
          },
        },
      },
      {
        key: 'tenantId',
        label: 'Tenant Id"',
        type: 'text',
        validators: {
          required: {
            type: 'required',
          },
        },
      },
      {
        key: 'subscriptionId',
        label: 'Subscription Id',
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
        Before you can provision and access a Kubernetes cluster on Azure, you need to add account/subscription credentials.
        The Gardener needs the credentials of a service principal assigned to an account/subscription to provision
        and operate the Azure infrastructure for your Kubernetes cluster.
      </p>
      <p>
        Ensure that the service principal has the permissions defined
        <a href="https://github.com/gardener/gardener-extension-provider-azure/blob/master/docs/usage/azure-permissions.md">here</a>
        within your subscription assigned.
        If no fine-grained permissions are required then assign the <strong>Contributor</strong> role.
      </p>
      <p>
        Read the
        <a href="https://docs.microsoft.com/azure/active-directory/role-based-access-control-configure">IAM Console help section</a>
        on how to manage your credentials and subscriptions.
      </p>
      `,
  },
}
