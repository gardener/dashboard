<!--
Copyright 2018 by The Gardener Authors.

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

<!--
Copyright 2018 by The Gardener Authors.

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
  <v-dialog v-model="visible" max-width="750">
    <v-card>
      <v-card-title class="orange white--text darken-2">
        <v-icon large class="white--text ml-3">mdi-help-circle-outline</v-icon>
        <span>About AWS Secrets</span>
      </v-card-title>
      <v-card-text class="helpContent">
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

      </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn class="orange--text" flat  @click.native.stop="visible = false">
          Got it
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
  import CodeBlock from '@/components/CodeBlock'

  export default {
    components: {
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
    computed: {
      visible: {
        get () {
          return this.value
        },
        set (value) {
          this.$emit('input', value)
        }
      }
    },
    methods: {
    }
  }
</script>



<style lang="styl" scoped>

  .card__title{
    background-image: url(../assets/aws_background.svg);
    background-size: cover;
    color:white;
    height:90px;
    span{
      font-size:24px
      padding-left:10px
      font-weight:400
    }
  }
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
