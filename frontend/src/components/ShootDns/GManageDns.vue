<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-container class="pa-0 ma-0">
    <template v-if="dnsProviderIds.length">
      <v-expand-transition>
        <v-row class="ma-0">
          <v-col cols="7">
            <v-text-field
              v-model="domain"
              color="primary"
              label="Cluster Domain"
              :disabled="!clusterIsNew"
              :persistent-hint="!clusterIsNew"
              :hint="domainHint"
              variant="underlined"
              @blur="v$.primaryProvider.$touch()"
            />
          </v-col>
          <v-col
            v-if="primaryProviderVisible"
            cols="4"
          >
            <v-select
              v-model="primaryProvider"
              color="primary"
              item-title="secretName"
              return-object
              :items="dnsProvidersWithPrimarySupport"
              :error-messages="errors.primaryProvider"
              label="Primary DNS Provider"
              clearable
              :disabled="!clusterIsNew"
              variant="underlined"
              @blur="v$.primaryProvider.$touch()"
              @update:model-value="v$.primaryProvider.$touch()"
            >
              <template #item="{ item, props }">
                <v-list-item
                  v-bind="props"
                >
                  <template #prepend>
                    <g-vendor-icon :icon="item.raw.type" />
                  </template>
                  <v-list-item-subtitle>
                    Type: {{ item.raw.type }}
                  </v-list-item-subtitle>
                </v-list-item>
              </template>
              <template #selection="{ item }">
                <g-vendor-icon :icon="item.raw.type" />
                <span class="ml-2">
                  {{ item.raw.secretName }}
                </span>
              </template>
            </v-select>
          </v-col>
        </v-row>
      </v-expand-transition>
      <v-row class="ma-0">
        <v-divider class="mx-3" />
      </v-row>
    </template>
    <div class="alternate-row-background">
      <g-expand-transition-group>
        <v-row
          v-for="id in dnsProviderIds"
          :key="id"
          class="list-item pt-2"
        >
          <g-dns-provider-row :dns-provider-id="id" />
        </v-row>
      </g-expand-transition-group>
      <v-row
        key="addProvider"
        class="list-item pt-2"
      >
        <v-col>
          <v-btn
            variant="text"
            color="primary"
            @click="addDnsProvider"
          >
            <v-icon class="text-primary">
              mdi-plus
            </v-icon>
            <span class="ml-2">Add DNS Provider</span>
          </v-btn>
        </v-col>
      </v-row>
    </div>
  </v-container>
</template>

<script>
import {
  mapState,
  mapActions,
} from 'pinia'
import { requiredIf } from '@vuelidate/validators'
import { useVuelidate } from '@vuelidate/core'

import { useShootStagingStore } from '@/store/shootStaging'

import GDnsProviderRow from '@/components/ShootDns/GDnsProviderRow'
import GVendorIcon from '@/components/GVendorIcon'
import GExpandTransitionGroup from '@/components/GExpandTransitionGroup'

import {
  withFieldName,
  nilUnless,
  withMessage,
} from '@/utils/validators'
import { getVuelidateErrors } from '@/utils'

export default {
  components: {
    GDnsProviderRow,
    GVendorIcon,
    GExpandTransitionGroup,
  },
  setup () {
    return {
      v$: useVuelidate(),
    }
  },
  validations () {
    return {
      primaryProvider: withFieldName('Primary DNS Provider', {
        required: withMessage('Provider is required if a custom domain is defined', requiredIf(this.clusterIsNew && !!this.domain)),
        nil: withMessage('Provider is not allowed if no custom domain is defined', nilUnless('domain')),
      }),
    }
  },
  computed: {
    ...mapState(useShootStagingStore, [
      'dnsDomain',
      'dnsProviderIds',
      'clusterIsNew',
      'dnsProvidersWithPrimarySupport',
      'dnsPrimaryProvider',
    ]),
    domainHint () {
      return this.clusterIsNew
        ? 'External available domain of the cluster'
        : 'Domain cannot be changed after cluster creation'
    },
    domain: {
      get () {
        return this.dnsDomain
      },
      set (value) {
        this.setDnsDomain(value)
      },
    },
    primaryProvider: {
      get () {
        return this.dnsPrimaryProvider
      },
      set (value) {
        this.setDnsPrimaryProvider(value)
      },
    },
    primaryProviderVisible () {
      return !!this.primaryProvider || (this.clusterIsNew && !!this.dnsDomain)
    },
    errors () {
      return getVuelidateErrors(this.v$.$errors)
    },
  },
  mounted () {
    this.v$.$touch()
  },
  methods: {
    ...mapActions(useShootStagingStore, [
      'addDnsProvider',
      'setDnsPrimaryProvider',
      'setDnsDomain',
    ]),
  },
}
</script>
