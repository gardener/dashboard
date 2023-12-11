<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <g-secret-dialog
    v-model="visible"
    :data="secretData"
    :secret-validations="v$"
    :secret="secret"
    :vendor="vendor"
    :create-title="`Add new ${name} Secret`"
    :replace-title="`Replace ${name} Secret`"
  >
    <template #secret-slot>
      <div>
        <v-text-field
          ref="accessKeyId"
          v-model="accessKeyId"
          color="primary"
          label="Access Key Id"
          :error-messages="getErrorMessages(v$.accessKeyId)"
          counter="128"
          hint="e.g. AKIAIOSFODNN7EXAMPLE"
          variant="underlined"
          @update:model-value="v$.accessKeyId.$touch()"
          @blur="v$.accessKeyId.$touch()"
        />
      </div>
      <div>
        <v-text-field
          v-model="secretAccessKey"
          color="primary"
          label="Secret Access Key"
          :error-messages="getErrorMessages(v$.secretAccessKey)"
          :append-icon="hideSecret ? 'mdi-eye' : 'mdi-eye-off'"
          :type="hideSecret ? 'password' : 'text'"
          counter="40"
          hint="e.g. wJalrXUtnFEMIK7MDENG/bPxRfiCYzEXAMPLEKEY"
          variant="underlined"
          @click:append="() => (hideSecret = !hideSecret)"
          @update:model-value="v$.secretAccessKey.$touch()"
          @blur="v$.secretAccessKey.$touch()"
        />
      </div>
      <div v-if="vendor === 'aws-route53'">
        <v-text-field
          v-model="awsRegion"
          color="primary"
          label="Region (optional)"
          hint="Overwrite default region of Route 53 endpoint. Required for certain regions. Example value: eu-central-1"
          variant="underlined"
        />
      </div>
    </template>
    <template #help-slot>
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
        <g-external-link url="https://console.aws.amazon.com/iam/home">
          IAM Console
        </g-external-link>.
      </p>
      <p>
        Copy the AWS IAM policy document below and attach it to the IAM user
        (<g-external-link url="http://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_manage.html">
          official
          documentation
        </g-external-link>).
      </p>
      <g-code-block
        v-if="vendor==='aws'"
        height="100%"
        lang="json"
        :content="JSON.stringify(templateAws, undefined, 2)"
      />
      <div v-if="vendor==='aws-route53'">
        <p>In this example, the placeholder for the hosted zone is Z2XXXXXXXXXXXX</p>
        <g-code-block
          height="100%"
          lang="json"
          :content="JSON.stringify(templateAwsRoute53, undefined, 2)"
        />
      </div>
    </template>
  </g-secret-dialog>
</template>

<script>
import { useVuelidate } from '@vuelidate/core'
import {
  required,
  minLength,
  maxLength,
} from '@vuelidate/validators'

import GSecretDialog from '@/components/Secrets/GSecretDialog'
import GCodeBlock from '@/components/GCodeBlock'
import GExternalLink from '@/components/GExternalLink'

import {
  withFieldName,
  alphaNumUnderscore,
  base64,
} from '@/utils/validators'
import {
  getErrorMessages,
  setDelayedInputFocus,
} from '@/utils'

export default {
  components: {
    GSecretDialog,
    GCodeBlock,
    GExternalLink,
  },
  props: {
    modelValue: {
      type: Boolean,
      required: true,
    },
    secret: {
      type: Object,
    },
    vendor: {
      type: String,
    },
  },
  emits: [
    'update:modelValue',
  ],
  setup () {
    return {
      v$: useVuelidate(),
    }
  },
  data () {
    return {
      accessKeyId: undefined,
      secretAccessKey: undefined,
      awsRegion: undefined,
      hideSecret: true,
      templateAws: {
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
      templateAwsRoute53: {
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
      },
    }
  },
  validations () {
    return {
      accessKeyId: withFieldName('Access Key ID', {
        required,
        minLength: minLength(16),
        maxLength: maxLength(128),
        alphaNumUnderscore,
      }),
      secretAccessKey: withFieldName('Secret Access Key', {
        required,
        minLength: minLength(40),
        base64,
      }),
    }
  },
  computed: {
    visible: {
      get () {
        return this.modelValue
      },
      set (modelValue) {
        this.$emit('update:modelValue', modelValue)
      },
    },
    valid () {
      return !this.v$.$invalid
    },
    secretData () {
      return {
        accessKeyID: this.accessKeyId,
        secretAccessKey: this.secretAccessKey,
        AWS_REGION: this.awsRegion,
      }
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
    },
  },
  watch: {
    value: function (value) {
      if (value) {
        this.reset()
      }
    },
  },
  methods: {
    reset () {
      this.v$.$reset()

      this.accessKeyId = ''
      this.secretAccessKey = ''
      this.awsRegion = ''

      if (!this.isCreateMode) {
        setDelayedInputFocus(this, 'accessKeyId')
      }
    },
    getErrorMessages,
  },
}
</script>
