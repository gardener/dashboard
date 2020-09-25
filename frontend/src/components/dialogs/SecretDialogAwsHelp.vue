<!--
SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <secret-dialog-help
    title="About AWS Secrets"
    color="orange darken-1"
    backgroundSrc="/static/background_aws.svg"
    :value="value"
    @input="onInput"
  >
    <template v-slot:help-content>
      <div class="help-content">
        <p>
          Before you can provision and access a Kubernetes cluster, you need to add account credentials. To manage
          credentials for AWS Identity and Access Management (IAM), use the
          <a href="https://console.aws.amazon.com/iam/home" target="_blank" class="orange--text  text--darken-2">IAM Console <v-icon style="font-size:80%">mdi-open-in-new</v-icon></a>.
          The Gardener needs the credentials to provision and operate the AWS infrastructure for your Kubernetes cluster.
        </p>
        <p>
          Copy the AWS IAM policy document below and attach it to the IAM user
          (<a class="orange--text text--darken-1" href="http://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_manage.html" target="_blank">official
          documentation <v-icon style="font-size:80%">mdi-open-in-new</v-icon></a>).
        </p>
        <code-block height="250px" lang="json" :content="JSON.stringify(template, undefined, 2)"></code-block>
      </div>
    </template>
  </secret-dialog-help>
</template>

<script>
import SecretDialogHelp from '@/components/dialogs/SecretDialogHelp'
import CodeBlock from '@/components/CodeBlock'

export default {
  components: {
    SecretDialogHelp,
    CodeBlock
  },
  props: {
    value: {
      type: Boolean,
      required: true
    }
  },
  data () {
    return {
      template: {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Action: 'autoscaling:*',
            Resource: '*'
          },
          {
            Effect: 'Allow',
            Action: 'ec2:*',
            Resource: '*'
          },
          {
            Effect: 'Allow',
            Action: 'elasticloadbalancing:*',
            Resource: '*'
          },
          {
            Action: [
              'iam:GetInstanceProfile',
              'iam:GetPolicy',
              'iam:GetPolicyVersion',
              'iam:GetRole',
              'iam:GetRolePolicy',
              'iam:ListPolicyVersions',
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
              'iam:UpdateAssumeRolePolicy'
            ],
            Effect: 'Allow',
            Resource: '*'
          },
          {
            Effect: 'Allow',
            Action: [
              'route53:GetChange',
              'route53:GetHostedZone',
              'route53:ListResourceRecordSets',
              'route53:ChangeResourceRecordSets',
              'route53:ListHostedZones'
            ],
            Resource: '*'
          }
        ]
      }
    }
  },
  methods: {
    onInput (value) {
      this.$emit('input', value)
    }
  }
}
</script>
