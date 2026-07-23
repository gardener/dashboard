export default {
  name: 'metal',
  displayName: 'metal-stack',
  weight: 600,
  icon: 'metal.svg',
  secret: {
    details: [
      {
        label: 'API URL',
        valueFrom: {
          key: ['metalAPIURL'],
        },
      },
    ],
  },
}
