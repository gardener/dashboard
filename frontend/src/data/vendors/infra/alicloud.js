export default {
  name: 'alicloud',
  displayName: 'Alibaba Cloud',
  weight: 500,
  icon: 'alicloud.svg',
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
