export default {
  name: 'azure-dns',
  displayName: 'Azure DNS',
  weight: 200,
  icon: 'azure-dns.svg',
  secret: {
    details: [
      {
        label: 'Subscription ID',
        valueFrom: {
          keys: [
            ['subscriptionID'],
            ['subscriptionId'],
          ],
        },
      },
    ],
  },
}
