//
// SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

export default {
  name: 'aws',
  displayName: 'AWS',
  weight: 100,
  icon: 'aws.svg',
  secret: {
    fields: [
      {
        key: 'accessKeyID',
        label: 'Access Key ID',
        hint: 'e.g. AKIAIOSFODNN7EXAMPLE',
        type: 'text',
        validators: {
          required: {
            type: 'required',
          },
        },
      },
      {
        key: 'secretAccessKey',
        label: 'Secret Access Key',
        hint: 'e.g. wJalrXUtnFEMIK7MDENG/bPxRfiCYzEXAMPLEKEY',
        type: 'password',
        validators: {
          required: {
            type: 'required',
          },
        },
      },
    ],
    help: `
      <p>
        Before you can provision and access a Kubernetes cluster, you need to add account credentials. Gardener needs the credentials to provision and operate the AWS infrastructure for your Kubernetes cluster.
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
      `,
    helpJSONTemplate: {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Action: 'autoscaling:*',
          Resource: '*',
        },
        {
          Effect: 'Allow',
          Action: 'ec2:*',
          Resource: '*',
        },
        {
          Effect: 'Allow',
          Action: 'elasticloadbalancing:*',
          Resource: '*',
        },
        {
          Action: [
            'iam:GetInstanceProfile',
            'iam:GetPolicy',
            'iam:GetPolicyVersion',
            'iam:GetRole',
            'iam:GetRolePolicy',
            'iam:ListPolicyVersions',
            'iam:ListRolePolicies',
            'iam:ListAttachedRolePolicies',
            'iam:ListInstanceProfilesForRole',
            'iam:CreateInstanceProfile',
            'iam:CreatePolicy',
            'iam:CreatePolicyVersion',
            'iam:CreateRole',
            'iam:CreateServiceLinkedRole',
            'iam:AddRoleToInstanceProfile',
            'iam:AttachRolePolicy',
            'iam:DetachRolePolicy',
            'iam:RemoveRoleFromInstanceProfile',
            'iam:DeletePolicy',
            'iam:DeletePolicyVersion',
            'iam:DeleteRole',
            'iam:DeleteRolePolicy',
            'iam:DeleteInstanceProfile',
            'iam:PutRolePolicy',
            'iam:PassRole',
            'iam:UpdateAssumeRolePolicy',
          ],
          Effect: 'Allow',
          Resource: '*',
        },
      ],
    },
  },
}
