<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
 -->

<template>
  <g-secret-dialog
    v-model="visible"
    :secret-validations="v$"
    :binding="binding"
    :provider-type="providerType"
    :create-title="`Add new ${name} Secret`"
    :update-title="`Update ${name} Secret`"
  >
    <template #secret-slot>
      <div>
        <v-textarea
          ref="serviceAccountKeyRef"
          v-model="serviceAccountKey"
          color="primary"
          variant="filled"
          label="Service Account Key"
          :error-messages="getErrorMessages(v$.serviceAccountKey)"
          hint="Enter or drop a service account key in JSON format"
          persistent-hint
          :append-icon="hideSecret ? 'mdi-eye' : 'mdi-eye-off'"
          :class="{ 'hide-secret': hideSecret }"
          @click:append="() => (hideSecret = !hideSecret)"
          @update:model-value="v$.serviceAccountKey.$touch()"
          @blur="v$.serviceAccountKey.$touch()"
        />
      </div>
    </template>
    <template #help-slot>
      <div
        v-if="providerType==='gcp'"
        class="help-content"
      >
        <p>
          A service account is a special account that can be used by services and applications running on your Google
          Compute Engine instance to interact with other Google Cloud Platform APIs. Applications can use service
          account credentials to authorize themselves to a set of APIs and perform actions within the permissions
          granted to the service account and virtual machine instance.
        </p>

        <p>
          Ensure that the service account has at least the roles below.
        </p>

        <ul>
          <li>Service Account Admin</li>
          <li>Service Account Token Creator</li>
          <li>Service Account User</li>
          <li>Compute Admin</li>
        </ul>

        <p>
          The Service Account has to be enabled for the Google Identity and Access Management API.
        </p>

        <p>
          Read the
          <g-external-link url="https://cloud.google.com/compute/docs/access/service-accounts">
            Service Account Documentation
          </g-external-link> on how to apply for credentials
          to service accounts.
        </p>
      </div>
      <div v-if="providerType==='google-clouddns'">
        <p>
          You need to provide a service account and a key (serviceaccount.json) to allow the dns-controller-manager to authenticate and execute calls to Cloud DNS.
        </p>
        <p>
          For details on Cloud DNS see
          <g-external-link url="https://cloud.google.com/dns/docs/zones" />,
          and on Service Accounts see
          <g-external-link url="https://cloud.google.com/iam/docs/service-accounts" />
        </p>
        <p>
          The service account needs permissions on the hosted zone to list and change DNS records. For details on which permissions or roles are required see <g-external-link url="https://cloud.google.com/dns/docs/access-control" />. A possible role is roles/dns.admin "DNS Administrator".
        </p>
      </div>
    </template>
  </g-secret-dialog>
</template>

<script>
import { useVuelidate } from '@vuelidate/core'
import { required } from '@vuelidate/validators'

import GSecretDialog from '@/components/Credentials/GSecretDialog'
import GExternalLink from '@/components/GExternalLink'

import { useProvideSecretContext } from '@/composables/credential/useSecretContext'

import {
  withFieldName,
  withMessage,
} from '@/utils/validators'
import {
  handleTextFieldDrop,
  getErrorMessages,
  setDelayedInputFocus,
} from '@/utils'

export default {
  components: {
    GSecretDialog,
    GExternalLink,
  },
  props: {
    modelValue: {
      type: Boolean,
      required: true,
    },
    binding: {
      type: Object,
    },
    providerType: {
      type: String,
    },
  },
  emits: [
    'update:modelValue',
  ],
  setup () {
    const { secretStringDataRefs } = useProvideSecretContext()

    const { serviceAccountKey } = secretStringDataRefs({
      'serviceaccount.json': 'serviceAccountKey',
    })

    return {
      serviceAccountKey,
      v$: useVuelidate(),
    }
  },
  data () {
    return {
      hideSecret: true,
      dropHandlerInitialized: false,
    }
  },
  validations () {
    const projectIDTestPattern = /^[a-z][a-z0-9-]{4,28}[a-z0-9]+$/

    return {
      serviceAccountKey: withFieldName('Service Account Key',
        {
          required,
          validJson: withMessage('Not a valid JSON', value => {
            try {
              JSON.parse(value)
              return true
            } catch (err) {
              return false
            }
          }),
          projectID: withMessage('Must contain a valid `project_id`', value => {
            try {
              const key = JSON.parse(value)
              return key.project_id && projectIDTestPattern.test(key.project_id)
            } catch (err) {
              return false
            }
          }),
          type: withMessage('Credential `type` must be "service_account"', value => {
            try {
              const key = JSON.parse(value)
              return key.type && key.type === 'service_account'
            } catch (err) {
              return false
            }
          }),

        },
      ),
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
    isCreateMode () {
      return !this.secret
    },
    name () {
      if (this.providerType === 'gcp') {
        return 'Google'
      }
      if (this.providerType === 'google-clouddns') {
        return 'Google Cloud DNS'
      }
      return undefined
    },
  },
  watch: {
    value: function (value) {
      if (value) {
        this.reset()

        // Mounted does not guarantee that all child components have also been mounted.
        // In addition, the serviceAccountKey ref is within a slot of a v-dialog, which is by default lazily loaded.
        // We initialize the drop handler once the dialog is shown by watching the `value`.
        // We use $nextTick to make sure the entire view has been rendered
        this.$nextTick(() => {
          this.initializeDropHandlerOnce()
        })
      }
    },
  },
  methods: {
    reset () {
      this.v$.$reset()

      this.serviceAccountKey = ''

      if (!this.isCreateMode) {
        setDelayedInputFocus(this, 'serviceAccountKey')
      }
    },
    initializeDropHandlerOnce () {
      if (this.dropHandlerInitialized) {
        return
      }

      this.dropHandlerInitialized = true
      const onDrop = value => {
        this.serviceAccountKey = value
      }
      handleTextFieldDrop(this.$refs.serviceAccountKeyRef, /json/, onDrop)
    },
    getErrorMessages,
  },
}
</script>

<style lang="scss" scoped>

  :deep(.v-input__control textarea) {
    font-family: monospace;
    font-size: 14px;
  }

  .help-content {
    ul {
      margin-top: 20px;
      margin-bottom: 20px;
      list-style-type: none;
      border-left: 4px solid #318334 !important;
      margin-left: 20px;
      padding-left: 24px;
      li {
        font-weight: 300;
        font-size: 16px;
      }
    }
  }

  .hide-secret {
    :deep(.v-input__control textarea) {
      -webkit-text-security: disc;
    }
  }

</style>
