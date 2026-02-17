//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import aws from '../infra/aws'

export default {
  name: 'aws-route53',
  displayName: 'Amazon Route53',
  weight: 100,
  icon: 'aws-route53.svg',
  secret: {
    fields: [
      ...aws.secret.fields,
      {
        key: 'AWS_REGION',
        label: 'Region (optional)',
        hint: 'Overwrite default region of Route 53 endpoint. Required for certain regions. Example value: eu-central-1',
        type: 'text',
      },
    ],
    help: `
      <p>
        Before you can use an external DNS provider, you need to add account credentials.
        The user needs permissions on the hosted zone to list and change DNS records.
      </p>
      <p>
        To manage
        credentials for AWS Identity and Access Management (IAM), use the
        <a href="https://console.aws.amazon.com/iam/home">IAM Console</a>.
      </p>
      <p>
        Copy the AWS IAM policy document below and attach it to the IAM user
        (<a href="http://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_manage.html">official documentation</a>).
      </p>
      <p>In this example, the placeholder for the hosted zone is Z2XXXXXXXXXXXX</p>
      `,
    helpJSONTemplate: {
      Version: '2012-10-17',
      Statement: [
        {
          Sid: 'VisualEditor0',
          Effect: 'Allow',
          Action: 'route53:ListResourceRecordSets',
          Resource: 'arn:aws:route53:::hostedzone/*',
        },
        {
          Sid: 'VisualEditor1',
          Effect: 'Allow',
          Action: 'route53:GetHostedZone',
          Resource: 'arn:aws:route53:::hostedzone/Z2XXXXXXXXXXXX',
        },
        {
          Sid: 'VisualEditor2',
          Effect: 'Allow',
          Action: 'route53:ListHostedZones',
          Resource: '*',
        },
        {
          Sid: 'VisualEditor3',
          Effect: 'Allow',
          Action: 'route53:ChangeResourceRecordSets',
          Resource: 'arn:aws:route53:::hostedzone/Z2XXXXXXXXXXXX',
        },
      ],
    },
  },
}
