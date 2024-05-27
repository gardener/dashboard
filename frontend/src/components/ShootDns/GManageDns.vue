<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <template v-if="dnsProviderIds.length">
    <v-expand-transition>
      <v-row>
        <v-col cols="7">
          <v-text-field
            v-model="dnsDomain"
            color="primary"
            label="Cluster Domain"
            :disabled="!isNewCluster"
            :persistent-hint="!isNewCluster"
            :hint="domainHint"
            variant="underlined"
            @blur="v$.dnsPrimaryProvider.$touch()"
          />
        </v-col>
        <v-col
          v-if="primaryProviderVisible"
          cols="4"
        >
          <v-select
            v-model="dnsPrimaryProvider"
            color="primary"
            item-title="secretName"
            return-object
            :items="dnsProvidersWithPrimarySupport"
            :error-messages="getErrorMessages(v$.dnsPrimaryProvider)"
            label="Primary DNS Provider"
            clearable
            :disabled="!isNewCluster"
            variant="underlined"
            @blur="v$.dnsPrimaryProvider.$touch()"
            @update:model-value="v$.dnsPrimaryProvider.$touch()"
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
    <v-row>
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
      class="list-item my-1"
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
          Add DNS Provider
        </v-btn>
      </v-col>
    </v-row>
  </div>
</template>

<script>
import { requiredIf } from '@vuelidate/validators'
import { useVuelidate } from '@vuelidate/core'

import GDnsProviderRow from '@/components/ShootDns/GDnsProviderRow'
import GVendorIcon from '@/components/GVendorIcon'
import GExpandTransitionGroup from '@/components/GExpandTransitionGroup'

import { useShootContext } from '@/composables/useShootContext'

import {
  withFieldName,
  nilUnless,
  withMessage,
} from '@/utils/validators'
import { getErrorMessages } from '@/utils'

export default {
  components: {
    GDnsProviderRow,
    GVendorIcon,
    GExpandTransitionGroup,
  },
  setup () {
    const {
      dnsDomain,
      dnsPrimaryProvider,
      isNewCluster,
      dnsProviderIds,
      dnsProvidersWithPrimarySupport,
      addDnsProvider,
    } = useShootContext()

    return {
      v$: useVuelidate(),
      dnsDomain,
      dnsPrimaryProvider,
      isNewCluster,
      dnsProviderIds,
      dnsProvidersWithPrimarySupport,
      addDnsProvider,
    }
  },
  validations () {
    return {
      dnsPrimaryProvider: withFieldName('Primary DNS Provider', {
        required: withMessage('Provider is required if a custom domain is defined', requiredIf(this.isNewCluster && !!this.dnsDomain)),
        nil: withMessage('Provider is not allowed if no custom domain is defined', nilUnless('dnsDomain')),
      }),
    }
  },
  computed: {
    domainHint () {
      return this.isNewCluster
        ? 'External available domain of the cluster'
        : 'Domain cannot be changed after cluster creation'
    },
    primaryProviderVisible () {
      return !!this.dnsPrimaryProvider || (this.isNewCluster && !!this.dnsDomain)
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
