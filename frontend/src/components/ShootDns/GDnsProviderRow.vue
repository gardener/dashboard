<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div class="d-flex flex-nowrap align-center">
    <div class="d-flex flex-wrap">
      <div class="regular-input">
        <v-select
          v-model="v$.dnsProviderType.$model"
          color="primary"
          :items="dnsProviderTypes"
          :error-messages="getErrorMessages(v$.dnsProviderType)"
          label="Dns Provider Type"
          variant="underlined"
        >
          <template #item="{ props }">
            <v-list-item v-bind="props">
              <template #prepend>
                <g-vendor-icon :icon="props.value" />
              </template>
            </v-list-item>
          </template>
          <template #selection="{ item }">
            <div class="d-flex">
              <g-vendor-icon
                :icon="item.value"
                class="mr-2"
              />
              {{ item.title }}
            </div>
          </template>
        </v-select>
      </div>
      <div class="regular-input">
        <g-select-credential
          v-if="dnsServiceExtensionProviderSecretBinding || !dnsProvider.secretName"
          v-model="dnsServiceExtensionProviderSecretBinding"
          :provider-type="dnsProviderType"
          :not-allowed-secret-names="usedSecretNames"
          register-vuelidate-as="dnsServiceExtensionProviderSecret"
        />
        <v-text-field
          v-else
          :value="dnsProvider.secretName"
          disabled
          variant="underlined"
          persistent-hint
          hint="Binding for secret not found in project namespace. Use YAML view to edit secret"
        />
      </div>
      <div class="large-input">
        <v-combobox
          v-model="includeDomains"
          label="Include Domains"
          multiple
          chips
          closable-chips
          variant="underlined"
        />
      </div>
      <div class="large-input">
        <v-combobox
          v-model="excludeDomains"
          label="Exclude Domains"
          multiple
          chips
          closable-chips
          variant="underlined"
        />
      </div>
      <div class="large-input">
        <v-combobox
          v-model="includeZones"
          label="Include Zones"
          multiple
          chips
          closable-chips
          variant="underlined"
        />
      </div>
      <div class="large-input">
        <v-combobox
          v-model="excludeZones"
          label="Exclude Zones"
          multiple
          chips
          closable-chips
          variant="underlined"
        />
      </div>
    </div>
    <div class="ml-4 mr-2">
      <slot name="action" />
    </div>
  </div>
</template>

<script>
import { toRef } from 'vue'
import { mapState } from 'pinia'
import { required } from '@vuelidate/validators'
import { useVuelidate } from '@vuelidate/core'

import { useGardenerExtensionStore } from '@/store/gardenerExtension'
import { useCredentialStore } from '@/store/credential'
import { useCloudProfileStore } from '@/store/cloudProfile'

import GSelectCredential from '@/components/Credentials/GSelectCredential'
import GVendorIcon from '@/components/GVendorIcon'

import { useShootContext } from '@/composables/useShootContext'
import { useCloudProviderEntityList } from '@/composables/credential/useCloudProviderEntityList'
import { credentialName } from '@/composables/credential/helper'

import { getErrorMessages } from '@/utils'
import { withFieldName } from '@/utils/validators'

import set from 'lodash/set'
import find from 'lodash/find'
import head from 'lodash/head'
import get from 'lodash/get'

export default {
  components: {
    GSelectCredential,
    GVendorIcon,
  },
  props: {
    dnsProvider: {
      type: Object,
      required: true,
    },
  },
  setup (props) {
    const {
      isNewCluster,
      dnsServiceExtensionProviders,
      getDnsServiceExtensionResourceName,
      setResource,
      deleteResource,
      getResourceRefName,
    } = useShootContext()

    const credentialStore = useCredentialStore()
    const gardenerExtensionStore = useGardenerExtensionStore()
    const cloudProfileStore = useCloudProfileStore()

    const dnsProviderType = toRef(props.dnsProvider, 'type')
    const dnsCloudProviderBindings = useCloudProviderEntityList(dnsProviderType, { credentialStore, gardenerExtensionStore, cloudProfileStore })

    return {
      v$: useVuelidate(),
      isNewCluster,
      dnsServiceExtensionProviders,
      getDnsServiceExtensionResourceName,
      setResource,
      deleteResource,
      getResourceRefName,
      dnsCloudProviderBindings,
    }
  },
  validations () {
    return {
      dnsProviderType: withFieldName('DNS Provider Type', {
        required,
      }),
    }
  },
  computed: {
    ...mapState(useGardenerExtensionStore, [
      'dnsProviderTypes',
    ]),
    dnsProviderType: {
      get () {
        return this.dnsProvider?.type
      },
      set (value) {
        this.dnsProvider.type = value
        const allowedCloudProviderBindings = this.dnsCloudProviderBindings.filter(binding => {
          const secretName = credentialName(binding)
          return binding.provider.type === value && !this.usedSecretNames.includes(secretName)
        })

        const defaultDnsSecret = head(allowedCloudProviderBindings)
        this.dnsServiceExtensionProviderSecretBinding = defaultDnsSecret
      },
    },
    dnsServiceExtensionProviderSecretBinding: {
      get () {
        const resourceName = this.dnsProvider.secretName
        const secretName = this.getResourceRefName(resourceName)

        return find(this.dnsCloudProviderBindings, binding => {
          return credentialName(binding) === secretName
        })
      },
      set (binding) {
        if (!binding) {
          this.dnsProvider.secretName = undefined
          return
        }
        this.deleteResource(this.dnsProvider.secretName)
        const secretName = credentialName(binding)
        const resourceName = this.getDnsServiceExtensionResourceName(secretName)
        this.dnsProvider.secretName = resourceName
        this.setResource({
          name: resourceName,
          resourceRef: {
            apiVersion: 'v1',
            kind: 'Secret',
            name: secretName,
          },
        })
      },
    },
    excludeDomains: {
      get () {
        return get(this.dnsProvider, ['domains', 'exclude'])
      },
      set (value) {
        set(this.dnsProvider, ['domains', 'exclude'], value)
      },
    },
    includeDomains: {
      get () {
        return get(this.dnsProvider, ['domains', 'include'])
      },
      set (value) {
        set(this.dnsProvider, ['domains', 'include'], value)
      },
    },
    excludeZones: {
      get () {
        return get(this.dnsProvider, ['zones', 'exclude'])
      },
      set (value) {
        set(this.dnsProvider, ['zones', 'exclude'], value)
      },
    },
    includeZones: {
      get () {
        return get(this.dnsProvider, ['zones', 'include'])
      },
      set (value) {
        set(this.dnsProvider, ['zones', 'include'], value)
      },
    },
    usedSecretNames () {
      return this.dnsServiceExtensionProviders.map(({ secretName }) => this.getResourceRefName(secretName))
    },
  },
  mounted () {
    this.v$.$touch()
  },
  methods: {
    getErrorMessages,
  },
}
</script>
