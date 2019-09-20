<!--
Copyright (c) 2019 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file

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
    title="About Alibaba Cloud Secrets"
    color="black"
    backgroundSrc="/static/background_alicloud.svg"
    :value="value"
    @input="onInput">
    <div slot="help-content" class="helpContent">
      <p>
        Before you can provision and access a Kubernetes cluster on Alibaba Cloud, you need to add account credentials. To manage
        credentials for Alibaba Cloud Resource Access Management (RAM), use the
        <a href="https://ram.console.aliyun.com/overview" target="_blank" class="orange--text  text--darken-2">RAM Console <v-icon style="font-size:80%">mdi-open-in-new</v-icon></a>.
        The Gardener needs the credentials to provision and operate the Alibaba Cloud infrastructure for your Kubernetes cluster.
      </p>
      <p>
        Copy the Alibaba Cloud RAM policy document below and attach it to the RAM user
        (<a class="orange--text text--darken-2" href="https://www.alibabacloud.com/help/product/28625.htm?spm=a3c0i.100866.1204872.1.79461e4eLtFABp" target="_blank">official
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
        'Statement': [
          {
            'Action': 'vpc:*',
            'Effect': 'Allow',
            'Resource': '*'
          },
          {
            'Action': 'oss:*',
            'Effect': 'Allow',
            'Resource': '*'
          },
          {
            'Action': 'ecs:*',
            'Effect': 'Allow',
            'Resource': '*'
          },
          {
            'Action': 'slb:*',
            'Effect': 'Allow',
            'Resource': '*'
          }
        ],
        'Version': '1'
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
