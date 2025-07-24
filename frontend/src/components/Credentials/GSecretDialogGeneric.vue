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
    :create-title="`Add new ${providerType} Secret`"
    :update-title="`Update ${providerType} Secret`"
  >
    <template #secret-slot>
      <div>
        <v-textarea
          v-model="data"
          color="primary"
          variant="filled"
          label="Secret Data"
          :error-messages="getErrorMessages(v$.data)"
          :append-icon="hideSecret ? 'mdi-eye' : 'mdi-eye-off'"
          :class="{ 'hide-secret': hideSecret }"
          @click:append="() => (hideSecret = !hideSecret)"
          @blur="v$.data.$touch()"
        />
      </div>
    </template>
    <template #help-slot>
      <div class="help-content">
        <p>
          This is a generic secret dialog.
        </p>
        <p>
          Please enter data required for {{ providerType }}.
        </p>
      </div>
    </template>
  </g-secret-dialog>
</template>

<script>
import { useVuelidate } from '@vuelidate/core'
import { required } from '@vuelidate/validators'
import yaml from 'js-yaml'

import GSecretDialog from '@/components/Credentials/GSecretDialog'

import { useProvideSecretContext } from '@/composables/credential/useSecretContext'

import {
  withFieldName,
  withMessage,
} from '@/utils/validators'
import { getErrorMessages } from '@/utils'

import isObject from 'lodash/isObject'

export default {
  components: {
    GSecretDialog,
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
    const { secretStringData } = useProvideSecretContext()

    return {
      stringData: secretStringData,
      v$: useVuelidate(),
    }
  },
  data () {
    return {
      hideSecret: true,
      internalYaml: '',
      touched: false,
    }
  },
  validations () {
    return {
      data: withFieldName('Secret Data', {
        required,
        isYAML: withMessage('You need to enter secret data as YAML key - value pairs', () => Object.keys(this.stringData).length > 0),
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
    data: {
      get () {
        return this.internalYaml
      },
      set (value) {
        this.internalYaml = value
        this.touched = true
        this.stringData = {}

        try {
          this.stringData = yaml.load(value)
        } catch (err) {
        /* ignore errors */
        } finally {
          if (!isObject(this.stringData)) {
            this.stringData = {}
          }
        }
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
    stringData (value) {
      if (!this.touched) {
        if (value && Object.keys(value).length > 0) {
          this.internalYaml = yaml.dump(value)
        } else {
          this.internalYaml = ''
        }
      }
    },
  },
  methods: {
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
