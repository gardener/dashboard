<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div>
    <!-- do not wrap v-row with tooltip component as this breaks expand (appear) animation -->
    <v-tooltip
      location="top"
      :disabled="!readonly"
      open-delay="0"
      :activator="$refs.dnsrow"
    >
      <span class="font-weight-bold">You cannot edit this DNS Provider</span><br>
      SecretBinding for secret {{ secretName }} not found in poject namespace
    </v-tooltip>
    <div
      ref="dnsrow"
      class="d-flex flex-nowrap align-center"
    >
      <div class="d-flex flex-wrap">
        <div class="regular-input">
          <v-select
            v-model="type"
            :disabled="readonly || primaryReadonly"
            color="primary"
            :items="dnsProviderTypes"
            :error-messages="getErrorMessages(v$.type)"
            label="Dns Provider Type"
            :hint="typeHint"
            persistent-hint
            variant="underlined"
            @blur="v$.type.$touch()"
            @update:model-value="v$.type.$touch()"
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
            v-model="secret"
            v-model:valid="secretValid"
            :disabled="readonly"
            :dns-provider-kind="type"
          />
        </div>
        <div class="regular-input">
          <v-combobox
            v-model="excludeDomains"
            :disabled="readonly"
            label="Exclude Domains"
            multiple
            closable-chips
            variant="underlined"
          />
        </div>
        <div class="regular-input">
          <v-combobox
            v-model="includeDomains"
            :disabled="readonly"
            label="Include Domains"
            multiple
            closable-chips
            variant="underlined"
          />
        </div>
        <div class="regular-input">
          <v-combobox
            v-model="excludeZones"
            :disabled="readonly"
            label="Exclude Zones"
            multiple
            closable-chips
            variant="underlined"
          />
        </div>
        <div class="regular-input">
          <v-combobox
            v-model="includeZones"
            :disabled="readonly"
            label="Include Zones"
            multiple
            closable-chips
            variant="underlined"
          />
        </div>
      </div>

      <div class="ml-4 mr-2">
        <v-btn
          :disabled="readonly || primaryReadonly"
          size="x-small"
          variant="tonal"
          icon="mdi-close"
          color="grey"
          @click="onDelete"
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
import { useShootStagingStore } from '@/store/shootStaging'
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
      type: withFieldName('DNS Provider Type', {
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
    ...mapState(useShootStagingStore, [
      'dnsProviders',
      'dnsPrimaryProviderId',
      'clusterIsNew',
    ]),
    ...mapState(useGardenerExtensionStore, ['dnsProviderTypes']),
    dnsProvider () {
      return this.dnsProviders[this.dnsProviderId]
    },
    primary () {
      return this.dnsPrimaryProviderId === this.dnsProviderId
    },
    dnsSecrets () {
      return this.dnsSecretsByProviderKind(this.type)
    },
    typeHint () {
      return this.primary && !this.clusterIsNew
        ? 'Primary Provider type cannot be changed after cluster creation'
        : ''
    },
    primaryReadonly () {
      return !this.clusterIsNew && this.primary
    },
    readonly () {
      return get(this.dnsProvider, 'readonly')
    },
    type: {
      get () {
        return get(this.dnsProvider, 'type')
      },
      set (value) {
        const dnsSecrets = this.dnsSecretsByProviderKind(value)
        const defaultDnsSecret = head(dnsSecrets)
        this.setData({
          type: value,
          secretName: get(defaultDnsSecret, 'metadata.secretRef.name', null),
        })
      },
    },
    secretName: {
      get () {
        return get(this.dnsProvider, 'secretName')
      },
      set (value) {
        this.setData({ secretName: value })
      },
    },
    secret: {
      get () {
        return find(this.dnsSecrets, ['metadata.secretRef.name', this.secretName])
      },
      set (value) {
        this.secretName = get(value, 'metadata.secretRef.name', null)
      },
    },
    includeDomains: {
      get () {
        return get(this.dnsProvider, 'includeDomains', [])
      },
      set (value = []) {
        this.setData({ includeDomains: value })
      },
    },
    excludeDomains: {
      get () {
        return get(this.dnsProvider, 'excludeDomains', [])
      },
      set (value = []) {
        this.setData({ excludeDomains: value })
      },
    },
    includeZones: {
      get () {
        return get(this.dnsProvider, 'includeZones', [])
      },
      set (value = []) {
        this.setData({ includeZones: value })
      },
    },
    excludeZones: {
      get () {
        return get(this.dnsProvider, 'excludeZones', [])
      },
      set (value = []) {
        this.setData({ excludeZones: value })
      },
    },
    valid () {
      return get(this.dnsProvider, 'valid')
    },
  },
  watch: {
    'v$.$invalid' () {
      this.updateValid()
    },
    secretValid () {
      this.updateValid()
    },
  },
  mounted () {
    this.v$.$touch()
  },
  methods: {
    ...mapActions(useShootStagingStore, [
      'patchDnsProvider',
      'deleteDnsProvider',
    ]),
    ...mapActions(useSecretStore, [
      'dnsSecretsByProviderKind',
    ]),
    setData (data) {
      this.patchDnsProvider({
        id: this.dnsProviderId,
        ...data,
      })
    },
    updateValid () {
      const valid = this.secretValid && !this.v$.$invalid
      if (this.valid !== valid && !this.readonly) {
        this.setData({ valid })
      }
    },
    onDelete () {
      this.deleteDnsProvider(this.dnsProviderId)
    },
    getErrorMessages,
  },
}
</script>
