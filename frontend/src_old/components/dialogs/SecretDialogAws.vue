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
          @update:model-value="$v.accessKeyId.$touch()"
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
          @update:model-value="$v.secretAccessKey.$touch()"
          @blur="$v.secretAccessKey.$touch()"
          counter="40"
          hint="e.g. wJalrXUtnFEMIK7MDENG/bPxRfiCYzEXAMPLEKEY"
        ></v-text-field>
      </div>
      <div v-if="vendor === 'aws-route53'">
        <v-text-field
          color="primary"
          v-model="awsRegion"
          label="Region (optional)"
          hint="Overwrite default region of Route 53 endpoint. Required for certain regions. Example value: eu-central-1"
        ></v-text-field>
      </div>
    </template>
    <template v-slot:help-slot>
      <p v-if="vendor==='aws'">
        Before you can provision and access a Kubernetes cluster, you need to add account credentials. Gardener needs the credentials to provision and operate the AWS infrastructure for your Kubernetes cluster.
      </p>
      <p v-if="vendor==='aws-route53'">
        Before you can use an external DNS provider, you need to add account credentials.
        The user needs permissions on the hosted zone to list and change DNS records.
      </p>
      <p>
        To manage
        credentials for AWS Identity and Access Management (IAM), use the
        <external-link url="https://console.aws.amazon.com/iam/home">IAM Console</external-link>.
      </p>
      <p>
        Copy the AWS IAM policy document below and attach it to the IAM user
        (<external-link url="http://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_manage.html">official
        documentation</external-link>).
      </p>
      <code-block v-if="vendor==='aws'" height="100%" lang="json" :content="JSON.stringify(templateAws, undefined, 2)"></code-block>
      <div v-if="vendor==='aws-route53'">
        <p>In this example, the placeholder for the hosted zone is Z2XXXXXXXXXXXX</p>
        <code-block height="100%" lang="json" :content="JSON.stringify(templateAwsRoute53, undefined, 2)"></code-block>
      </div>
    </template>

  </secret-dialog>

</template>

<script>
import SecretDialog from '@/components/dialogs/SecretDialog.vue'
import CodeBlock from '@/components/CodeBlock.vue'
import ExternalLink from '@/components/ExternalLink.vue'
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
    CodeBlock,
    ExternalLink
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
      secretAccessKey: undefined,
      awsRegion: undefined,
      hideSecret: true,
      validationErrors,
      templateAws: {
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
      },
      templateAwsRoute53: {
        Version: '2012-10-17',
        Statement: [
          {
            Sid: 'VisualEditor0',
            Effect: 'Allow',
            Action: 'route53:ListResourceRecordSets',
            Resource: 'arn:aws:route53:::hostedzone/*'
          },
          {
            Sid: 'VisualEditor1',
            Effect: 'Allow',
            Action: 'route53:GetHostedZone',
            Resource: 'arn:aws:route53:::hostedzone/Z2XXXXXXXXXXXX'
          },
          {
            Sid: 'VisualEditor2',
            Effect: 'Allow',
            Action: 'route53:ListHostedZones',
            Resource: '*'
          },
          {
            Sid: 'VisualEditor3',
            Effect: 'Allow',
            Action: 'route53:ChangeResourceRecordSets',
            Resource: 'arn:aws:route53:::hostedzone/Z2XXXXXXXXXXXX'
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
        secretAccessKey: this.secretAccessKey,
        AWS_REGION: this.awsRegion
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
    },
    name () {
      if (this.vendor === 'aws') {
        return 'AWS'
      }
      if (this.vendor === 'aws-route53') {
        return 'Amazon Route 53'
      }
      return undefined
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
      this.awsRegion = ''

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
