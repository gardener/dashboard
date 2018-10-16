<!--
Copyright (c) 2018 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
 -->

<template>
  <secret-dialog-help
    title="About AWS Secrets"
    color="orange"
    backgroundSrc="/static/background_aws.svg"
    :value="value"
    @input="onInput">
    <div slot="help-content" class="helpContent">
      <p>
        Before you can provision and access a Kubernetes cluster, you need to add account credentials. To manage
        credentials for AWS Identity and Access Management (IAM), use the
        <a href="https://console.aws.amazon.com/iam/home" target="_blank" class="orange--text  text--darken-2">IAM Console <v-icon style="font-size:80%">mdi-open-in-new</v-icon></a>.
        The Gardener needs the credentials to provision and operate the AWS infrastructure for your Kubernetes cluster.
      </p>
      <p>
        Copy the AWS IAM policy document below and attach it to the IAM user
        (<a class="orange--text text--darken-2" href="http://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_manage.html" target="_blank">official
        documentation <v-icon style="font-size:80%">mdi-open-in-new</v-icon></a>).
      </p>
      <code-block height="250px" lang="json" :content="JSON.stringify(template, undefined, 2)"></code-block>
    </div>
  </secret-dialog-help>
</template>

<script>
import SecretDialogHelp from '@/dialogs/SecretDialogHelp'
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
        'Version': '2012-10-17',
        'Statement': [
          {
            'Effect': 'Allow',
            'Action': 'autoscaling:*',
            'Resource': '*'
          },
          {
            'Effect': 'Allow',
            'Action': 'ec2:*',
            'Resource': '*'
          },
          {
            'Effect': 'Allow',
            'Action': 'elasticloadbalancing:*',
            'Resource': '*'
          },
          {
            'Action': [
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
              'iam:PassRole'
            ],
            'Effect': 'Allow',
            'Resource': '*'
          },
          {
            'Effect': 'Allow',
            'Action': [
              'route53:GetChange',
              'route53:GetHostedZone',
              'route53:ListResourceRecordSets',
              'route53:ChangeResourceRecordSets'
            ],
            'Resource': '*'
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

<style lang="styl" scoped>

  .helpContent {
    a {
      text-decoration: none;
    }
    h1 {
      font-size:22px;
      font-weight:400;
    }
    p {
      font-size:16px
      font-weight:300;
    }
  }

</style>
