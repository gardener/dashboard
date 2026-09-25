import { subscriptionIdDetail } from '../infra/azure'

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
}
