import {
  subscriptionIdDetail,
  azureWorkloadIdentity,
} from '../infra/azure'

import {
  fields,
  help,
} from './azure-dns'

export default {
  name: 'azure-private-dns',
  displayName: 'Azure Private DNS',
  weight: 300,
  icon: 'azure-dns.svg',
  secret: {
    details: [
      subscriptionIdDetail,
    ],
    fields,
    help,
  },
  workloadIdentity: {
    ...azureWorkloadIdentity,
    help: `
      <p>Enter the Client ID, Tenant ID and Subscription ID for the application managing your private DNS zones. Configure a federated identity credential with the Gardener issuer, this identity's Subject and the same Audience.</p>
      <p>Grant Private DNS Zone Contributor permissions at the intended scope. No client secret is needed.</p>
      <p><a href="https://github.com/gardener/gardener-extension-shoot-dns-service/blob/master/docs/usage/workloadidentity/azure.md">DNS workload identity integration</a></p>
    `,
  },
}
