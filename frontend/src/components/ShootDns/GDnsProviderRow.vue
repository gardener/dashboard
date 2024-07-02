<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div class="d-flex flex-nowrap align-center">
    <div class="d-flex flex-wrap">
      <div class="regular-input">
        <v-select
          v-model="dnsProviderType"
          color="primary"
          :items="dnsProviderTypes"
          :error-messages="getErrorMessages(v$.dnsProviderType)"
          label="Dns Provider Type"
          variant="underlined"
          @change="v$.dnsProviderType.$touch()"
          @blur="v$.dnsProviderType.$touch()"
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
        <g-select-secret
          v-if="extensionDnsProviderSecret || !dnsProvider.secretName"
          v-model="extensionDnsProviderSecret"
          :dns-provider-kind="dnsProviderType"
          :filter-secret-names="filterSecretNames"
          register-vuelidate-as="extensionDnsProviderSecret"
        />
        <v-text-field
          v-else
          :value="dnsProvider.secretName"
          disabled
          variant="underlined"
          persistent-hint
          hint="Secret Binding for secret not found in project namespace. Use YAML view to edit secret"
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
import {
  mapState,
  mapActions,
} from 'pinia'
import { required } from '@vuelidate/validators'
import { useVuelidate } from '@vuelidate/core'

import { useSecretStore } from '@/store/secret'
import { useGardenerExtensionStore } from '@/store/gardenerExtension'

import GSelectSecret from '@/components/Secrets/GSelectSecret'
import GVendorIcon from '@/components/GVendorIcon'

import { useShootContext } from '@/composables/useShootContext'

import { getErrorMessages } from '@/utils'
import { withFieldName } from '@/utils/validators'

import {
  get,
  head,
  find,
  set,
} from '@/lodash'

export default {
  components: {
    GSelectSecret,
    GVendorIcon,
  },
  props: {
    dnsProvider: {
      type: Object,
      required: true,
    },
  },
  setup () {
    const {
      isNewCluster,
      dnsServiceExtensionProviders,
      getDnsServiceExtensionResourceName,
      setResource,
      deleteResource,
      getResourceRefName,
    } = useShootContext()

    return {
      v$: useVuelidate(),
      isNewCluster,
      dnsServiceExtensionProviders,
      getDnsServiceExtensionResourceName,
      setResource,
      deleteResource,
      getResourceRefName,
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
    dnsSecrets () {
      return this.dnsSecretsByProviderKind(this.dnsProviderType)
    },
    dnsProviderType: {
      get () {
        return this.dnsProvider?.type
      },
      set (value) {
        this.dnsProvider.type = value
        const dnsSecrets = this.dnsSecretsByProviderKind(value)
        const defaultDnsSecret = head(dnsSecrets)
        this.extensionDnsProviderSecret = defaultDnsSecret
      },
    },
    extensionDnsProviderSecret: {
      get () {
        const resourceName = this.dnsProvider.secretName
        const secretName = this.getResourceRefName(resourceName)
        return find(this.dnsSecrets, ['metadata.secretRef.name', secretName])
      },
      set (value) {
        this.deleteResource(this.dnsProvider.secretName)
        const secretName = get(value, 'metadata.secretRef.name')
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
        return get(this.dnsProvider, 'domains.exclude')
      },
      set (value) {
        set(this.dnsProvider, 'domains.exclude', value)
      },
    },
    includeDomains: {
      get () {
        return get(this.dnsProvider, 'domains.include')
      },
      set (value) {
        set(this.dnsProvider, 'domains.include', value)
      },
    },
    excludeZones: {
      get () {
        return get(this.dnsProvider, 'zones.exclude')
      },
      set (value) {
        set(this.dnsProvider, 'zones.exclude', value)
      },
    },
    includeZones: {
      get () {
        return get(this.dnsProvider, 'zones.include')
      },
      set (value) {
        set(this.dnsProvider, 'zones.include', value)
      },
    },
    filterSecretNames () {
      return this.dnsServiceExtensionProviders.map(provider => {
        const secretName = this.getResourceRefName(provider.secretName) // provider.secretName is the resource name
        if (secretName !== this.extensionDnsProviderSecret?.metadata.name) {
          return secretName
        }
        return undefined
      })
    },
  },
  mounted () {
    this.v$.$touch()
  },
  methods: {
    ...mapActions(useSecretStore, [
      'dnsSecretsByProviderKind',
    ]),
    getErrorMessages,
  },
}
</script>
