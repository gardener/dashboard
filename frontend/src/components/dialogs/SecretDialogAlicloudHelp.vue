<!--
SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <secret-dialog-help
    title="About Alibaba Cloud Secrets"
    color="grey darken-4"
    backgroundSrc="/static/background_alicloud.svg"
    :value="value"
    @input="onInput"
  >
    <template v-slot:help-content>
      <div class="help-content">
        <p>
          Before you can provision and access a Kubernetes cluster on Alibaba Cloud, you need to add account credentials. To manage
          credentials for Alibaba Cloud Resource Access Management (RAM), use the
          <a href="https://ram.console.aliyun.com/overview" target="_blank" class="grey--text  text--darken-2">RAM Console <v-icon style="font-size:80%">mdi-open-in-new</v-icon></a>.
          The Gardener needs the credentials to provision and operate the Alibaba Cloud infrastructure for your Kubernetes cluster.
        </p>
        <p>
          Gardener uses encrypted system disk when creating Shoot, please enable ECS disk encryption on Alibaba Cloud Console
          (<a class="grey--text text--darken-2" href="https://www.alibabacloud.com/help/doc-detail/59643.htm" target="_blank">official
          documentation <v-icon style="font-size:80%">mdi-open-in-new</v-icon></a>).
        </p>
        <p>
          Copy the Alibaba Cloud RAM policy document below and attach it to the RAM user
          (<a class="grey--text text--darken-2" href="https://www.alibabacloud.com/help/product/28625.htm?spm=a3c0i.100866.1204872.1.79461e4eLtFABp" target="_blank">official
          documentation <v-icon style="font-size:80%">mdi-open-in-new</v-icon></a>). Alternatively, you can assign following permissions to the RAM
          user: AliyunECSFullAccess, AliyunSLBFullAccess, AliyunVPCFullAccess, AliyunEIPFullAccess, AliyunNATGatewayFullAccess.
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
        Statement: [
          {
            Action: 'vpc:*',
            Effect: 'Allow',
            Resource: '*'
          },
          {
            Action: 'ecs:*',
            Effect: 'Allow',
            Resource: '*'
          },
          {
            Action: 'slb:*',
            Effect: 'Allow',
            Resource: '*'
          }
        ],
        Version: '1'
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
