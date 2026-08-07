import {
  accessKeyIdDetail,
  accessKeyIdField,
  secretAccessKeyField,
} from '../infra/aws'

export default {
  name: 'aws-route53',
  displayName: 'Amazon Route53',
  weight: 100,
  icon: 'aws-route53.svg',
  secret: {
    details: [
      accessKeyIdDetail,
    ],
    fields: [
      accessKeyIdField,
      secretAccessKeyField,
      {
        key: 'AWS_REGION',
        label: 'Region (optional)',
        hint: 'Overwrite default region of Route 53 endpoint. Required for certain regions. Example value: eu-central-1',
        type: 'text',
        omitWhenEmpty: true,
      },
    ],
  },
}
