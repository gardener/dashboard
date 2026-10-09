import {
  clientIdField,
  clientSecretField,
  subscriptionIdDetail,
  subscriptionIdField,
  tenantIdField,
} from '../infra/azure'

export const cloudField = {
  key: 'AZURE_CLOUD',
  label: 'Azure Cloud',
  type: 'select',
  defaultValue: '',
  omitWhenEmpty: true,
  values: [
    {
      title: 'Provider default (Azure Public)',
      value: '',
    },
    {
      title: 'AzurePublic',
      value: 'AzurePublic',
    },
    {
      title: 'AzureChina',
      value: 'AzureChina',
    },
    {
      title: 'AzureGovernment',
      value: 'AzureGovernment',
    },
  ],
}

export const help = `
  <p>
    Follow the steps as described in the Azure documentation to
    <a href="https://docs.microsoft.com/en-us/azure/dns/dns-sdk#create-a-service-principal-account">create a service principal account</a>
    and grant the service principal account 'DNS Zone Contributor' permissions to the resource group.
  </p>
`

export const fields = [
  { ...clientIdField, aliases: ['AZURE_CLIENT_ID'] },
  { ...clientSecretField, aliases: ['AZURE_CLIENT_SECRET'] },
  { ...tenantIdField, aliases: ['AZURE_TENANT_ID'] },
  { ...subscriptionIdField, aliases: ['AZURE_SUBSCRIPTION_ID'] },
  cloudField,
]

export default {
  name: 'azure-dns',
  displayName: 'Azure DNS',
  weight: 200,
  icon: 'azure-dns.svg',
  secret: {
    details: [
      subscriptionIdDetail,
    ],
    fields,
    help,
  },
}
