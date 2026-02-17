//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import azure from '../infra/azure'

export default {
  name: 'azure-dns',
  displayName: 'Azure DNS',
  weight: 200,
  icon: 'azure-dns.svg',
  secret: {
    fields: [
      ...azure.secret.fields,
      {
        key: 'azureCloud',
        label: 'Azure Cloud',
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
        Follow the steps as described in the Azure documentation to
        <a href="https://docs.microsoft.com/en-us/azure/dns/dns-sdk#create-a-service-principal-account">create a service principal account</a>
        and grant the service principal account 'DNS Zone Contributor' permissions to the resource group.
      </p>
      `,
  },
}
