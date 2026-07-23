export default {
  name: 'azure',
  displayName: 'Azure',
  weight: 200,
  icon: 'azure.svg',
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
