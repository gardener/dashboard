import {
  clientIdField,
  clientSecretField,
  subscriptionIdDetail,
  subscriptionIdField,
  tenantIdField,
} from '../infra/azure'

import {
  cloudField,
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
    fields: [
      clientIdField,
      clientSecretField,
      tenantIdField,
      subscriptionIdField,
      cloudField,
    ],
    help,
  },
}
