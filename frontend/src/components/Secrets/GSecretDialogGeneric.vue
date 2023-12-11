<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <g-secret-dialog
    v-model="visible"
    :data="customCloudProviderData"
    :secret-validations="v$"
    :secret="secret"
    :vendor="vendor"
  >
    <template #secret-slot>
      <template v-if="customCloudProviderFields">
        <g-generic-input-fields
          v-model="customCloudProviderData"
          :fields="customCloudProviderFields"
        />
      </template>
    </template>
    <template #help-slot>
      <!-- eslint-disable vue/no-v-html -->
      <div
        v-if="helpHtml"
        class="markdown"
        v-html="helpHtml"
      />
      <div v-else>
        <p>
          This is a generic provider service account dialog.
        </p>
        <p>
          Please enter data required for {{ vendor }}.
        </p>
      </div>
    </template>
  </g-secret-dialog>
</template>

<script>

import { mapState } from 'pinia'
import { useVuelidate } from '@vuelidate/core'

import { useConfigStore } from '@/store/config'

import GSecretDialog from '@/components/Secrets/GSecretDialog'
import GGenericInputFields from '@/components/GGenericInputFields'

import {
  setDelayedInputFocus,
  transformHtml,
} from '@/utils'

import { get } from '@/lodash'

export default {
  components: {
    GSecretDialog,
    GGenericInputFields,
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
      customCloudProviderData: {},
    }
  },
  computed: {
    ...mapState(useConfigStore, [
      'customCloudProviders',
    ]),
    visible: {
      get () {
        return this.modelValue
      },
      set (modelValue) {
        this.$emit('update:modelValue', modelValue)
      },
    },
    customCloudProvider () {
      return get(this.customCloudProviders, this.vendor)
    },
    customCloudProviderFields () {
      const configuredFields = this.customCloudProvider?.secret?.fields
      if (configuredFields) {
        return configuredFields
      }
      return [
        {
          key: 'secret',
          label: 'Secret Data',
          hint: 'Provide secret data as YAML key-value pairs',
          type: 'yaml',
          validators: {
            required: {
              type: 'required',
            },
            isYAML: {
              type: 'isValidObject',
              message: 'You need to enter secret data as YAML key- value pairs',
            },
          },
        },
      ]
    },
    helpHtml () {
      return transformHtml(this.customCloudProvider?.secret?.help)
    },
    isCreateMode () {
      return !this.secret
    },
  },
  methods: {
    reset () {
      this.v$.$reset()

      this.customCloudProviderParsedData = {}
      this.customCloudProviderData = {}
      this.showSecrets = {}

      if (!this.isCreateMode) {
        setDelayedInputFocus(this, 'textAreaData')
      }
    },
  },
}
</script>

<style lang="scss" scoped>

.markdown {
  :deep(p) {
    margin: 0px;
  }
}

</style>
