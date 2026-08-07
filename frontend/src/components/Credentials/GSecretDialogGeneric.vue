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
    :vendor-type="vendorType"
  >
    <template #secret-slot>
      <g-generic-input-fields
        v-if="providerFields?.length"
        v-model="secretFieldValues"
        :fields="providerFields"
      />
      <g-generic-input-field
        v-else
        v-model="secretStringData"
        :field="defaultInputField"
      />
    </template>
    <template #help-slot>
      <slot name="help">
        <!-- The HTML comes exclusively from static vendor definitions and cannot be controlled by users. -->
        <!-- eslint-disable vue/no-v-html -->
        <div
          v-if="helpHtml"
          class="markdown"
          v-html="helpHtml"
        />
        <div v-else>
          <p>
            This is a generic secret dialog.
          </p>
          <p>
            Please enter data required for <code>{{ vendorName }}</code>.
          </p>
        </div>
      </slot>
    </template>
  </g-secret-dialog>
</template>

<script>
import { mapActions } from 'pinia'
import { useVuelidate } from '@vuelidate/core'

import { useConfigStore } from '@/store/config'

import GGenericInputField from '@/components/GGenericInputField'
import GGenericInputFields from '@/components/GGenericInputFields'
import GSecretDialog from '@/components/Credentials/GSecretDialog'

import { useProvideSecretContext } from '@/composables/credential/useSecretContext'

import { transformHtml } from '@/utils'

export default {
  components: {
    GGenericInputField,
    GGenericInputFields,
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
    credential: {
      type: Object,
    },
    providerType: {
      type: String,
    },
    vendorType: {
      type: String,
      required: true,
    },
  },
  emits: [
    'update:modelValue',
  ],
  setup () {
    const {
      secretStringData,
      getSecretFieldValues,
      setSecretFieldValues,
    } = useProvideSecretContext()

    return {
      secretStringData,
      getSecretFieldValues,
      setSecretFieldValues,
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
      return this.vendorSecretConfiguration?.fields
    },
    secretFieldValues: {
      get () {
        return this.getSecretFieldValues(this.providerFields)
      },
      set (value) {
        this.setSecretFieldValues(this.providerFields, value)
      },
    },
    defaultInputField () {
      return {
        label: 'Secret Data',
        hint: 'Provide secret data as YAML key-value pairs',
        type: 'yaml',
        sensitive: true,
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
    vendorName () {
      return this.vendorDisplayName({
        type: this.vendorType,
        name: this.providerType,
      })
    },
    vendorSecretConfiguration () {
      return this.vendorDetails({
        type: this.vendorType,
        name: this.providerType,
      })?.secret
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
    margin: 0;
  }
}

</style>
