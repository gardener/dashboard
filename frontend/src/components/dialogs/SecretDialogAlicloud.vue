<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <secret-dialog
    :value=value
    :data="secretData"
    :data-valid="valid"
    :secret="secret"
    :vendor="vendor"
    :create-title="`Add new ${name} Secret`"
    :replace-title="`Replace ${name} Secret`"
    @input="onInput">

    <template v-slot:secret-slot>
      <div>
        <v-text-field
          color="primary"
          v-model="accessKeyId"
          ref="accessKeyId"
          label="Access Key Id"
          :error-messages="getErrorMessages('accessKeyId')"
          @input="$v.accessKeyId.$touch()"
          @blur="$v.accessKeyId.$touch()"
          counter="128"
          hint="e.g. QNJebZ17v5Q7pYpP"
        ></v-text-field>
      </div>
      <div>
        <v-text-field
          color="primary"
          v-model="accessKeySecret"
          label="Access Key Secret"
          :error-messages="getErrorMessages('accessKeySecret')"
          :append-icon="hideSecret ? 'mdi-eye' : 'mdi-eye-off'"
          :type="hideSecret ? 'password' : 'text'"
          @click:append="() => (hideSecret = !hideSecret)"
          @input="$v.accessKeySecret.$touch()"
          @blur="$v.accessKeySecret.$touch()"
          counter="30"
          hint="e.g. WJalrXUtnFEMIK7MDENG/bPxRfiCYz"
        ></v-text-field>
      </div>
    </template>
    <template v-slot:help-slot>
      <div v-if="vendor==='alicloud'">
        <p>
          Before you can provision and access a Kubernetes cluster on Alibaba Cloud, you need to add account credentials. To manage
          credentials for Alibaba Cloud Resource Access Management (RAM), use the
          <a href="https://ram.console.aliyun.com/overview" target="_blank">RAM Console <v-icon style="font-size:80%">mdi-open-in-new</v-icon></a>.
          The Gardener needs the credentials to provision and operate the Alibaba Cloud infrastructure for your Kubernetes cluster.
        </p>
        <p>
          Gardener uses encrypted system disk when creating Shoot, please enable ECS disk encryption on Alibaba Cloud Console
          (<a href="https://www.alibabacloud.com/help/doc-detail/59643.htm" target="_blank">official
          documentation <v-icon style="font-size:80%">mdi-open-in-new</v-icon></a>).
        </p>
        <p>
          Copy the Alibaba Cloud RAM policy document below and attach it to the RAM user
          (<a href="https://www.alibabacloud.com/help/product/28625.htm?spm=a3c0i.100866.1204872.1.79461e4eLtFABp" target="_blank">official
          documentation <v-icon style="font-size:80%">mdi-open-in-new</v-icon></a>). Alternatively, you can assign following permissions to the RAM
          user: AliyunECSFullAccess, AliyunSLBFullAccess, AliyunVPCFullAccess, AliyunEIPFullAccess, AliyunNATGatewayFullAccess.
        </p>
        <code-block height="100%" lang="json" :content="JSON.stringify(template, undefined, 2)"></code-block>
      </div>
      <div v-if="vendor==='alicloud-dns'">
        <p>Before you can use an external DNS provider, you need to add account credentials.</p>
        <p>Make sure that you configure your account for DNS usage</p>
      </div>
    </template>

  </secret-dialog>

</template>

<script>
import SecretDialog from '@/components/dialogs/SecretDialog'
import CodeBlock from '@/components/CodeBlock'
import { required, minLength, maxLength } from 'vuelidate/lib/validators'
import { getValidationErrors, setDelayedInputFocus } from '@/utils'

const validationErrors = {
  accessKeyId: {
    required: 'You can\'t leave this empty.',
    minLength: 'It must contain at least 16 characters.',
    maxLength: 'It exceeds the maximum length of 128 characters.'
  },
  accessKeySecret: {
    required: 'You can\'t leave this empty.',
    minLength: 'It must contain at least 30 characters.'
  }
}

export default {
  components: {
    SecretDialog,
    CodeBlock
  },
  props: {
    value: {
      type: Boolean,
      required: true
    },
    secret: {
      type: Object
    },
    vendor: {
      type: String
    }
  },
  data () {
    return {
      accessKeyId: undefined,
      accessKeySecret: undefined,
      hideSecret: true,
      validationErrors,
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
          },
          {
            Action: [
              'ram:GetRole',
              'ram:CreateRole',
              'ram:CreateServiceLinkedRole'
            ],
            Effect: 'Allow',
            Resource: '*'
          }
        ],
        Version: '1'
      }
    }
  },
  validations () {
    // had to move the code to a computed property so that the getValidationErrors method can access it
    return this.validators
  },
  computed: {
    valid () {
      return !this.$v.$invalid
    },
    name () {
      if (this.vendor === 'alicloud') {
        return 'Alibaba Cloud'
      }
      if (this.vendor === 'alicloud-dns') {
        return 'Alicloud DNS'
      }
      return undefined
    },
    secretData () {
      return {
        accessKeyID: this.accessKeyId,
        accessKeySecret: this.accessKeySecret
      }
    },
    validators () {
      const validators = {
        accessKeyId: {
          required,
          minLength: minLength(16),
          maxLength: maxLength(128)
        },
        accessKeySecret: {
          required,
          minLength: minLength(30)
        }
      }
      return validators
    },
    isCreateMode () {
      return !this.secret
    }
  },
  methods: {
    onInput (value) {
      this.$emit('input', value)
    },
    reset () {
      this.$v.$reset()

      this.accessKeyId = ''
      this.accessKeySecret = ''

      if (!this.isCreateMode) {
        setDelayedInputFocus(this, 'accessKeyId')
      }
    },
    getErrorMessages (field) {
      return getValidationErrors(this, field)
    }
  },
  watch: {
    value: function (value) {
      if (value) {
        this.reset()
      }
    }
  }
}
</script>
