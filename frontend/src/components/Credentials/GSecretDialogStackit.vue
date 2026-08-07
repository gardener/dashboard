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
  >
    <template #secret-slot>
      <div>
        <v-text-field
          v-model="projectId"
          color="primary"
          variant="filled"
          label="Project ID"
          :error-messages="getErrorMessages(v$.projectId)"
          @update:model-value="v$.projectId.$touch()"
          @blur="v$.projectId.$touch()"
        />
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
        v-if="providerType === 'stackit'"
        class="help-content"
      >
        <p>
          To authenticate against STACKIT, you need to provide your <b>Project ID</b> and a <b>Service Account Key</b> (serviceaccount.json).
        </p>
        <p>
          The service account key must be a valid JSON file containing your credentials and private key.
        </p>
        <p>
          For details on configuring your STACKIT provider and generating the required service account, please refer to the
          <g-external-link url="https://github.com/stackitcloud/gardener-extension-provider-stackit/blob/main/docs/cloudprovider.md">
            STACKIT Cloud Provider Documentation
          </g-external-link>.
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

    const { projectId, serviceAccountKey } = secretStringDataRefs({
      'project-id': 'projectId',
      'serviceaccount.json': 'serviceAccountKey',
    })

    return {
      projectId,
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
    return {
      projectId: withFieldName('Project ID', {
        required,
      }),
      serviceAccountKey: withFieldName('Service Account Key', {
        required,
        validJson: withMessage('Not a valid JSON', value => {
          try {
            JSON.parse(value)
            return true
          } catch (err) {
            return false
          }
        }),
        privateKey: withMessage('Must contain a valid private key', value => {
          try {
            const key = JSON.parse(value)
            return key.credentials != null && typeof key.credentials.privateKey === 'string' && key.credentials.privateKey.length > 0
          } catch (err) {
            return false
          }
        }),
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
    isCreateMode () {
      return !this.secret
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

      this.projectId = ''
      this.serviceAccountKey = ''

      if (!this.isCreateMode) {
        setDelayedInputFocus(this, 'projectId')
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
