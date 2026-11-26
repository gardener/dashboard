import {
  accessKeyIdDetail,
  accessKeyIdField,
  secretAccessKeyField,
  awsWorkloadIdentity,
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
      { ...accessKeyIdField, aliases: ['AWS_ACCESS_KEY_ID'] },
      { ...secretAccessKeyField, aliases: ['AWS_SECRET_ACCESS_KEY'] },
      {
        key: 'region',
        aliases: ['AWS_REGION'],
        label: 'Region (optional)',
        hint: 'Overwrite default region of Route 53 endpoint. Required for certain regions. Example value: eu-central-1',
        type: 'text',
        omitWhenEmpty: true,
      },
    ],
  },
  workloadIdentity: {
    ...awsWorkloadIdentity,
    help: `
      <p>Configure AWS federation for your Gardener workload identity issuer and use an IAM role with permission to manage the intended Route53 hosted zones.</p>
      <p>Enter its Role ARN and matching audience. The WorkloadIdentity targets AWS even though the DNS provider is Amazon Route53. After creation, copy the exact Subject from Details into the trust policy.</p>
      <p><a href="https://github.com/gardener/gardener-extension-shoot-dns-service/blob/master/docs/usage/workloadidentity/aws.md">DNS workload identity integration</a></p>
    `,
  },
}
