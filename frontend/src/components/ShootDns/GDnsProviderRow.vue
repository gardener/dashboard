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
      SecretBinding for secret {{ dnsProvider.secretName }} not found in poject namespace
    </v-tooltip>
    <div
      ref="dnsRow"
      class="d-flex flex-nowrap align-center"
    >
      <div class="d-flex flex-wrap">
        <div class="regular-input">
          <v-select
            v-model="dnsProviderType"
            :disabled="dnsProvider.readonly || primaryReadonly"
            color="primary"
            :items="dnsProviderTypes"
            :error-messages="getErrorMessages(v$.dnsProviderType)"
            label="Dns Provider Type"
            :hint="typeHint"
            persistent-hint
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
            v-model="dnsProviderSecret"
            :disabled="dnsProvider.readonly"
            :dns-provider-kind="dnsProviderType"
            register-vuelidate-as="dnsProviderSecret"
          />
        </div>
        <div class="regular-input">
          <v-combobox
            v-model="dnsProvider.excludeDomains"
            :disabled="dnsProvider.readonly"
            label="Exclude Domains"
            multiple
            closable-chips
            variant="underlined"
          />
        </div>
        <div class="regular-input">
          <v-combobox
            v-model="dnsProvider.includeDomains"
            :disabled="dnsProvider.readonly"
            label="Include Domains"
            multiple
            closable-chips
            variant="underlined"
          />
        </div>
        <div class="regular-input">
          <v-combobox
            v-model="dnsProvider.excludeZones"
            :disabled="dnsProvider.readonly"
            label="Exclude Zones"
            multiple
            closable-chips
            variant="underlined"
          />
        </div>
        <div class="regular-input">
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
          :disabled="dnsProvider.readonly || primaryReadonly"
          size="x-small"
          variant="tonal"
          icon="mdi-close"
          color="grey"
          @click="deleteDnsProvider(dnsProviderId)"
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
import { useShootContextStore } from '@/store/shootContext'
import { useGardenerExtensionStore } from '@/store/gardenerExtension'

import GSelectSecret from '@/components/Secrets/GSelectSecret'
import GVendorIcon from '@/components/GVendorIcon'

import { getErrorMessages } from '@/utils'
import { withFieldName } from '@/utils/validators'

import {
  get,
  head,
  find,
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
    return {
      v$: useVuelidate(),
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
    ...mapState(useShootContextStore, [
      'dnsProviders',
      'dnsPrimaryProviderId',
      'isNewCluster',
    ]),
    ...mapState(useGardenerExtensionStore, [
      'dnsProviderTypes',
    ]),
    dnsProvider () {
      return this.dnsProviders[this.dnsProviderId]
    },
    primary () {
      return this.dnsPrimaryProviderId === this.dnsProviderId
    },
    dnsSecrets () {
      return this.dnsSecretsByProviderKind(this.dnsProviderType)
    },
    typeHint () {
      return this.primary && !this.isNewCluster
        ? 'Primary Provider type cannot be changed after cluster creation'
        : ''
    },
    primaryReadonly () {
      return !this.isNewCluster && this.primary
    },
    dnsProviderType: {
      get () {
        return this.dnsProvider.type
      },
      set (value) {
        this.dnsProvider.type = value
        const dnsSecrets = this.dnsSecretsByProviderKind(value)
        const defaultDnsSecret = head(dnsSecrets)
        this.dnsProvider.secretName = get(defaultDnsSecret, 'metadata.secretRef.name', null)
      },
    },
    dnsProviderSecret: {
      get () {
        return find(this.dnsSecrets, ['metadata.secretRef.name', this.dnsProvider.secretName])
      },
      set (value) {
        this.dnsProvider.secretName = get(value, 'metadata.secretRef.name', null)
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
    ...mapActions(useShootContextStore, [
      'deleteDnsProvider',
    ]),
    ...mapActions(useSecretStore, [
      'dnsSecretsByProviderKind',
    ]),
    getErrorMessages,
  },
}
</script>
