<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div>
    <!-- do not wrap v-row with tooltip component as this breaks expand (appear) animation -->
    <v-tooltip
      location="top"
      :disabled="!dnsProvider.readonly"
      open-delay="0"
      :activator="$refs.dnsRow"
    >
      <span class="font-weight-bold">You cannot edit this DNS Provider</span><br>
      SecretBinding for secret {{ dnsProvider.secretRefName }} not found in poject namespace
    </v-tooltip>
    <div
      ref="dnsRow"
      class="d-flex flex-nowrap align-center"
    >
      <div class="d-flex flex-wrap">
        <div class="regular-input">
          <v-select
            v-model="dnsProviderType"
            :disabled="dnsProvider.readonly"
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
            v-model="extensionDnsProviderSecret"
            :disabled="dnsProvider.readonly"
            :dns-provider-kind="dnsProviderType"
            :filter-secret-names="filterSecretNames"
            register-vuelidate-as="extensionDnsProviderSecret"
          />
        </div>
        <div class="large-input">
          <v-combobox
            v-model="excludeDomains"
            :disabled="dnsProvider.readonly"
            label="Exclude Domains"
            multiple
            closable-chips
            variant="underlined"
          />
        </div>
        <div class="large-input">
          <v-combobox
            v-model="includeDomains"
            :disabled="dnsProvider.readonly"
            label="Include Domains"
            multiple
            closable-chips
            variant="underlined"
          />
        </div>
        <div class="large-input">
          <v-combobox
            v-model="excludeZones"
            :disabled="dnsProvider.readonly"
            label="Exclude Zones"
            multiple
            closable-chips
            variant="underlined"
          />
        </div>
        <div class="large-input">
          <v-combobox
            v-model="includeZones"
            :disabled="dnsProvider.readonly"
            label="Include Zones"
            multiple
            closable-chips
            variant="underlined"
          />
        </div>
      </div>
      <div class="ml-4 mr-2">
        <slot name="action" />
      </div>
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
      extensionDnsProviders,
      getExtensionDnsResourceName,
      addExtensionDnsProviderResourceRef,
      deleteExtensionDnsProviderResourceRef,
      secretNameFromResources,
    } = useShootContext()

    return {
      v$: useVuelidate(),
      isNewCluster,
      extensionDnsProviders,
      getExtensionDnsResourceName,
      addExtensionDnsProviderResourceRef,
      deleteExtensionDnsProviderResourceRef,
      secretNameFromResources,
    }
  },
  validations () {
    return {
      dnsProviderType: withFieldName('DNS Provider Type', {
        required,
      }),
    }
  },
  data () {
    return {
      secretValid: true,
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
        return find(this.dnsSecrets, ['metadata.secretRef.name', this.secretNameFromResources(this.dnsProvider.secretName)]) // this.dnsProvider.secretName is the resource name
      },
      set (value) {
        this.deleteExtensionDnsProviderResourceRef(this.dnsProvider.secretName)

        const secretName = get(value, 'metadata.secretRef.name', undefined)
        this.dnsProvider.secretName = this.getExtensionDnsResourceName(secretName) // secretName is the resource name
        this.addExtensionDnsProviderResourceRef(this.dnsProvider.secretName, secretName)
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
      return this.extensionDnsProviders.map(provider => {
        const secretName = this.secretNameFromResources(provider.secretName) // provider.secretName is the resource name
        if (secretName !== this.extensionDnsProviderSecret?.metadata.name) {
          return secretName
        }
        return undefined
      })
    },
  },
  watch: {
    'v$.$invalid' (value) {
      const oldValue = !this.dnsProvider?.valid
      if (oldValue !== value && !this.dnsProvider.readonly) {
        this.dnsProvider.valid = !value
      }
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
