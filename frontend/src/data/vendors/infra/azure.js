export const subscriptionIdDetail = {
  label: 'Subscription ID',
  valueFrom: {
    key: ['subscriptionID'],
  },
}

export const clientIdField = {
  key: 'clientID',
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
}

export const clientSecretField = {
  key: 'clientSecret',
  label: 'Client Secret',
  type: 'text',
  sensitive: true,
  validators: {
    required: {
      type: 'required',
    },
  },
}

export const tenantIdField = {
  key: 'tenantID',
  label: 'Tenant Id',
  type: 'text',
  validators: {
    required: {
      type: 'required',
    },
    guid: {
      type: 'guid',
    },
  },
}

export const subscriptionIdField = {
  key: 'subscriptionID',
  label: 'Subscription Id',
  type: 'text',
  validators: {
    required: {
      type: 'required',
    },
    guid: {
      type: 'guid',
    },
  },
}

export const workloadIdentityClientIdField = {
  ...clientIdField,
  label: 'Client ID',
  path: ['clientID'],
}

export const workloadIdentityTenantIdField = {
  ...tenantIdField,
  label: 'Tenant ID',
  path: ['tenantID'],
  immutableOnEdit: true,
}

export const workloadIdentitySubscriptionIdField = {
  ...subscriptionIdField,
  label: 'Subscription ID',
  path: ['subscriptionID'],
  immutableOnEdit: true,
}

export const azureWorkloadIdentity = {
  targetSystemType: 'azure',
  providerConfigDefaults: {
    apiVersion: 'azure.provider.extensions.gardener.cloud/v1alpha1',
    kind: 'WorkloadIdentityConfig',
  },
  fields: [
    workloadIdentityClientIdField,
    workloadIdentityTenantIdField,
    workloadIdentitySubscriptionIdField,
  ],
  details: [
    { label: 'Subscription ID', valueFrom: { key: ['spec', 'targetSystem', 'providerConfig', 'subscriptionID'] } },
    { label: 'Client ID', valueFrom: { key: ['spec', 'targetSystem', 'providerConfig', 'clientID'] } },
  ],
  help: `
    <p>Enter the application Client ID, Directory Tenant ID and Subscription ID that Gardener should use. Set Audience to the exact value in the application's federated identity credential.</p>
    <p>After creation, copy the Subject from Details and configure Microsoft Entra ID to trust the Gardener issuer, subject and audience. Assign the service principal the permissions required by the Azure provider extension. Tenant and subscription cannot be changed after creation.</p>
    <p><a href="https://github.com/gardener/gardener-extension-provider-azure/blob/master/docs/usage/usage.md#azure-workload-identity-federation">Azure federation setup</a></p>
  `,
}

export default {
  name: 'azure',
  displayName: 'Azure',
  weight: 200,
  icon: 'azure.svg',
  secret: {
    details: [
      subscriptionIdDetail,
    ],
    fields: [
      clientIdField,
      clientSecretField,
      tenantIdField,
      subscriptionIdField,
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
  workloadIdentity: azureWorkloadIdentity,
}
