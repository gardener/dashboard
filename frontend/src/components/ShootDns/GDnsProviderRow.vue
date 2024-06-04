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
            register-vuelidate-as="extensionDnsProviderSecret"
          />
        </div>
        <div class="large-input">
          <v-combobox
            v-model="dnsProvider.excludeDomains"
            :disabled="dnsProvider.readonly"
            label="Exclude Domains"
            multiple
            closable-chips
            variant="underlined"
          />
        </div>
        <div class="large-input">
          <v-combobox
            v-model="dnsProvider.includeDomains"
            :disabled="dnsProvider.readonly"
            label="Include Domains"
            multiple
            closable-chips
            variant="underlined"
          />
        </div>
        <div class="large-input">
          <v-combobox
            v-model="dnsProvider.excludeZones"
            :disabled="dnsProvider.readonly"
            label="Exclude Zones"
            multiple
            closable-chips
            variant="underlined"
          />
        </div>
        <div class="large-input">
          <v-combobox
            v-model="dnsProvider.includeZones"
            :disabled="dnsProvider.readonly"
            label="Include Zones"
            multiple
            closable-chips
            variant="underlined"
          />
        </div>
      </div>

      <div class="ml-4 mr-2">
        <v-btn
          :disabled="dnsProvider.readonly"
          size="x-small"
          variant="tonal"
          icon="mdi-close"
          color="grey"
          @click="deleteExtensionDnsProvider(dnsProviderId)"
        />
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
import {
  withFieldName,
  withMessage,
} from '@/utils/validators'

import {
  get,
  head,
  find,
  filter,
} from '@/lodash'

export default {
  components: {
    GSelectSecret,
    GVendorIcon,
  },
  props: {
    dnsProviderId: {
      type: String,
      required: true,
    },
  },
  setup () {
    const {
      isNewCluster,
      extensionDnsProviders,
      deleteExtensionDnsProvider,
      getExtensionDnsSecretName,
    } = useShootContext()

    return {
      v$: useVuelidate(),
      isNewCluster,
      extensionDnsProviders,
      deleteExtensionDnsProvider,
      getExtensionDnsSecretName,
    }
  },
  validations () {
    return {
      dnsProviderType: withFieldName('DNS Provider Type', {
        required,
        uniqueProviderTypeSecret: withMessage('Combination of DNS Provider Type and Secret must be unique across shoot-dns-service Providers',
          type => {
            return filter(this.extensionDnsProviders, { type, secretRefName: this.dnsProvider.secretRefName }).length < 2
          },
        ),
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
    dnsProvider () {
      return this.extensionDnsProviders[this.dnsProviderId]
    },
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
        return find(this.dnsSecrets, ['metadata.secretRef.name', this.dnsProvider.secretRefName])
      },
      set (value) {
        const secretRefName = get(value, 'metadata.secretRef.name', undefined)
        this.dnsProvider.secretRefName = secretRefName
        this.dnsProvider.secretName = this.getExtensionDnsSecretName(secretRefName)
      },
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
