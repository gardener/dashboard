<!--
SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <p v-if="isRoute53">
    Before you can use an external DNS provider, you need to add account credentials.
    The user needs permissions on the hosted zone to list and change DNS records.
  </p>
  <p v-else>
    Before you can provision and access a Kubernetes cluster, you need to add account credentials. Gardener needs the credentials to provision and operate the AWS infrastructure for your Kubernetes cluster.
  </p>
  <p>
    To manage credentials for AWS Identity and Access Management (IAM), use the
    <g-external-link url="https://console.aws.amazon.com/iam/home">
      IAM Console
    </g-external-link>.
  </p>
  <p>
    Copy the AWS IAM policy document below and attach it to the IAM user
    (<g-external-link url="http://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_manage.html">
      official documentation
    </g-external-link>).
  </p>
  <p v-if="isRoute53">
    In this example, the placeholder for the hosted zone is Z2XXXXXXXXXXXX
  </p>
  <g-code-block
    max-height="100%"
    lang="json"
    :content="policy"
  />
</template>

<script setup>
import { computed } from 'vue'

import GCodeBlock from '@/components/GCodeBlock'
import GExternalLink from '@/components/GExternalLink'

const awsPolicy = JSON.stringify({
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
}, undefined, 2)

const route53Policy = JSON.stringify({
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
}, undefined, 2)

const props = defineProps({
  providerType: {
    type: String,
    required: true,
  },
})

const isRoute53 = computed(() => props.providerType === 'aws-route53')
const policy = computed(() => isRoute53.value ? route53Policy : awsPolicy)
</script>
