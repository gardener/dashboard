<!--
SPDX-FileCopyrightText: 2026 SAP SE or an SAP affiliate company and Gardener contributors

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
        v-model="serviceIdentity"
        :fields="serviceIdentityFields"
      />
      <g-generic-input-field
        v-model="orgClusterUrl"
        :field="orgClusterUrlField"
      />
      <g-generic-input-field
        v-model="caBundle"
        :field="caBundleField"
      />
    </template>

    <template #help-slot>
      <!-- eslint-disable vue/no-v-html -- HTML comes exclusively from static vendor definitions and cannot be controlled by users. -->
      <div
        class="markdown"
        v-html="helpHtml"
      />
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

import {
  decodeBase64,
  encodeBase64,
  transformHtml,
} from '@/utils'

import pick from 'lodash/pick'

const configKey = 'gdch-config'

const orgClusterUrlField = {
  key: 'url',
  label: 'Org Cluster URL',
  hint: 'URL of the GDC Global API Server',
  type: 'text',
  validators: {
    required: { type: 'required' },
    url: { type: 'url' },
  },
}

const caBundleField = {
  key: 'caBundle',
  label: 'CA Bundle',
  hint: 'Enter or drop the CA bundle PEM file of the GDC Global API Server',
  type: 'pem',
  validators: {
    required: { type: 'required' },
  },
}

export default {
  components: {
    GGenericInputField,
    GGenericInputFields,
    GSecretDialog,
  },
  props: {
    modelValue: { type: Boolean, required: true },
    binding: { type: Object },
    credential: { type: Object },
    providerType: { type: String, required: true },
    vendorType: { type: String, required: true },
  },
  emits: [
    'update:modelValue',
  ],
  setup () {
    const {
      getSecretFieldValues,
      setSecretFieldValues,
    } = useProvideSecretContext()

    return {
      caBundleField,
      getSecretFieldValues,
      orgClusterUrlField,
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
      return this.vendorSecretConfiguration?.fields ?? []
    },
    serviceIdentityFields () {
      return this.providerFields.filter(field => field.key !== configKey)
    },
    vendorSecretConfiguration () {
      return this.vendorDetails({
        type: this.vendorType,
        name: this.providerType,
      })?.secret
    },
    helpHtml () {
      return transformHtml(this.vendorSecretConfiguration?.help)
    },
    secretFieldValues: {
      get () {
        return this.getSecretFieldValues(this.providerFields)
      },
      set (value) {
        this.setSecretFieldValues(this.providerFields, value)
      },
    },
    serviceIdentity: {
      get () {
        return pick(this.secretFieldValues, this.serviceIdentityFields.map(field => field.key))
      },
      set (value) {
        this.secretFieldValues = {
          ...this.secretFieldValues,
          ...value,
        }
      },
    },
    gdchConfig () {
      const value = this.secretFieldValues['gdch-config']
      if (!value) {
        return {}
      }

      try {
        const parsed = JSON.parse(value)
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
          ? parsed
          : {}
      } catch {
        return {}
      }
    },
    orgClusterUrl: {
      get () {
        return this.gdchConfig.url ?? ''
      },
      set (value) {
        this.updateConfig({ url: value })
      },
    },
    caBundle: {
      get () {
        const value = this.gdchConfig.caBundle
        if (!value) {
          return ''
        }

        try {
          return decodeBase64(value)
        } catch {
          return value
        }
      },
      set (value) {
        this.updateConfig({ caBundle: encodeBase64(value) })
      },
    },
  },
  methods: {
    ...mapActions(useConfigStore, ['vendorDetails']),
    updateConfig (value) {
      this.secretFieldValues = {
        ...this.secretFieldValues,
        [configKey]: JSON.stringify({
          ...this.gdchConfig,
          ...value,
        }),
      }
    },
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
