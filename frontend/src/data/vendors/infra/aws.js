export default {
  name: 'aws',
  displayName: 'AWS',
  weight: 100,
  icon: 'aws.svg',
  secret: {
    details: [
      {
        label: 'Access Key ID',
        valueFrom: {
          key: ['accessKeyID'],
        },
      },
    ],
  },
}
