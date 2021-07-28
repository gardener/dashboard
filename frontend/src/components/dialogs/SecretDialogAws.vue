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
    cloud-provider-kind="aws"
    create-title="Add new AWS Secret"
    replace-title="Replace AWS Secret"
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
          hint="e.g. AKIAIOSFODNN7EXAMPLE"
        ></v-text-field>
      </div>
      <div>
        <v-text-field
          color="primary"
          v-model="secretAccessKey"
          label="Secret Access Key"
          :error-messages="getErrorMessages('secretAccessKey')"
          :append-icon="hideSecret ? 'mdi-eye' : 'mdi-eye-off'"
          :type="hideSecret ? 'password' : 'text'"
          @click:append="() => (hideSecret = !hideSecret)"
          @input="$v.secretAccessKey.$touch()"
          @blur="$v.secretAccessKey.$touch()"
          counter="40"
          hint="e.g. wJalrXUtnFEMIK7MDENG/bPxRfiCYzEXAMPLEKEY"
        ></v-text-field>
      </div>
    </template>
    <template v-slot:help-slot>
      <div>
        <p>
          Before you can provision and access a Kubernetes cluster, you need to add account credentials. To manage
          credentials for AWS Identity and Access Management (IAM), use the
          <a href="https://console.aws.amazon.com/iam/home" target="_blank" rel="noopener">IAM Console <v-icon style="font-size:80%">mdi-open-in-new</v-icon></a>.
          The Gardener needs the credentials to provision and operate the AWS infrastructure for your Kubernetes cluster.
        </p>
        <p>
          Copy the AWS IAM policy document below and attach it to the IAM user
          (<a href="http://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_manage.html" target="_blank" rel="noopener">official
          documentation <v-icon style="font-size:80%">mdi-open-in-new</v-icon></a>).
        </p>
        <code-block height="100%" lang="json" :content="JSON.stringify(template, undefined, 2)"></code-block>
      </div>
    </template>

  </secret-dialog>

</template>

<script>
import SecretDialog from '@/components/dialogs/SecretDialog'
import CodeBlock from '@/components/CodeBlock'
import { required, minLength, maxLength } from 'vuelidate/lib/validators'
import { alphaNumUnderscore, base64 } from '@/utils/validators'
import { getValidationErrors, setDelayedInputFocus } from '@/utils'

const validationErrors = {
  accessKeyId: {
    required: 'You can\'t leave this empty.',
    minLength: 'It must contain at least 16 characters.',
    maxLength: 'It exceeds the maximum length of 128 characters.',
    alphaNumUnderscore: 'Please use only alphanumeric characters and underscore.'
  },
  secretAccessKey: {
    required: 'You can\'t leave this empty.',
    minLength: 'It must contain at least 40 characters.',
    base64: 'Invalid secret access key.'
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
    }
  },
  data () {
    return {
      accessKeyId: undefined,
      secretAccessKey: undefined,
      hideSecret: true,
      validationErrors,
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
              'iam:UpdateAssumeRolePolicy'
            ],
            Effect: 'Allow',
            Resource: '*'
          }
        ]
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
    secretData () {
      return {
        accessKeyID: this.accessKeyId,
        secretAccessKey: this.secretAccessKey
      }
    },
    validators () {
      const validators = {
        accessKeyId: {
          required,
          minLength: minLength(16),
          maxLength: maxLength(128),
          alphaNumUnderscore
        },
        secretAccessKey: {
          required,
          minLength: minLength(40),
          base64
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
      this.secretAccessKey = ''

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
