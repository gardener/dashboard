<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <g-secret-dialog
    v-model="visible"
    :secret-validations="v$"
    :binding="binding"
    :credential="credential"
    :provider-type="providerType"
  >
    <template #secret-slot>
      <g-generic-input-fields
        v-if="providerFields"
        v-model="secretStringData"
        :fields="providerFields"
      />
      <GGenericInputField
        v-else
        v-model="secretStringData"
        :field="defaultInputField"
      />
    </template>
    <template #help-slot>
      <!-- eslint-disable vue/no-v-html -->
      <template v-if="helpHtml">
        <div
          class="markdown"
          v-html="helpHtml"
        />
        <g-code-block
          v-if="helpJSONTemplate"
          class="mt-3"
          max-height="100%"
          lang="json"
          :content="helpJSONTemplate"
        />
      </template>
      <div v-else>
        <p>
          This is a generic secret dialog.
        </p>
        <p>
          Please enter data required for <code>{{ vendorDisplayName(providerType) }}</code>.
        </p>
      </div>
    </template>
  </g-secret-dialog>
</template>

<script>
import { mapActions } from 'pinia'
import { useVuelidate } from '@vuelidate/core'

import { useConfigStore } from '@/store/config'

import GSecretDialog from '@/components/Credentials/GSecretDialog'
import GGenericInputFields from '@/components/GGenericInputFields'
import GGenericInputField from '@/components/GGenericInputField'
import GCodeBlock from '@/components/GCodeBlock'

import { useProvideSecretContext } from '@/composables/credential/useSecretContext'

import { transformHtml } from '@/utils'

export default {
  components: {
    GSecretDialog,
    GGenericInputFields,
    GGenericInputField,
    GCodeBlock,
  },
  props: {
    modelValue: {
      type: Boolean,
      required: true,
    },
    binding: {
      type: Object,
    },
    credential: {
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
      secretStringData,
      v$: useVuelidate(),
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
    providerFields () {
      if (!this.vendorSecretConfiguration?.fields) {
        return undefined
      }
      return this.vendorSecretConfiguration?.fields
    },
    defaultInputField () {
      return {
        label: 'Secret Data',
        hint: 'Provide secret data as YAML key-value pairs',
        type: 'yaml-secret',
        validators: {
          required: {
            type: 'required',
          },
          isYAML: {
            type: 'isValidObject',
          },
        },
      }
    },
    helpHtml () {
      return transformHtml(this.vendorSecretConfiguration?.help)
    },
    helpJSONTemplate () {
      return JSON.stringify(this.vendorSecretConfiguration?.helpJSONTemplate, undefined, 2)
    },
    isCreateMode () {
      return !this.secret
    },
    vendorSecretConfiguration () {
      return this.vendorDetails(this.providerType)?.secret
    },
  },
  methods: {
    ...mapActions(useConfigStore, ['vendorDetails', 'vendorDisplayName']),
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
