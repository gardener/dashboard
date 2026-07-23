export default {
  name: 'aws-route53',
  displayName: 'Amazon Route53',
  weight: 100,
  icon: 'aws-route53.svg',
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
