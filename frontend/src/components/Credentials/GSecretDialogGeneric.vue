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
      <GGenericInputField
        v-model="secretStringData"
        :field="defaultInputField"
      />
    </template>
    <template #help-slot>
      <div class="help-content">
        <p>
          This is a generic secret dialog.
        </p>
        <p>
          Please enter data required for {{ vendorName }}.
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
import GGenericInputField from '@/components/GGenericInputField'

import { useProvideSecretContext } from '@/composables/credential/useSecretContext'

export default {
  components: {
    GSecretDialog,
    GGenericInputField,
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
    defaultInputField () {
      return {
        key: 'secretData',
        label: 'Secret Data',
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
    vendorName () {
      return this.vendorDisplayName({
        type: this.vendorType,
        name: this.providerType,
      })
    },
  },
  methods: {
    ...mapActions(useConfigStore, ['vendorDisplayName']),
  },
}
</script>

<style lang="scss" scoped>

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

</style>
