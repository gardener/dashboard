<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-container class="pa-0 ma-0">
    <template v-if="dnsProviderIds.length">
      <v-row class="ma-0">
        <v-col cols="7">
          <v-text-field
            color="primary"
            label="Cluster Domain"
            v-model="domain"
            @blur="v$.primaryProvider.$touch()"
            :disabled="!clusterIsNew"
            :persistent-hint="!clusterIsNew"
            :hint="domainHint"
            variant="underlined"
          ></v-text-field>
        </v-col>
        <v-col cols="4" v-if="primaryProviderVisible">
          <v-select
            color="primary"
            item-title="secretName"
            return-object
            v-model="primaryProvider"
            @blur="v$.primaryProvider.$touch()"
            @update:modelValue="v$.primaryProvider.$touch()"
            :items="dnsProvidersWithPrimarySupport"
            :error-messages="getErrorMessages('primaryProvider')"
            label="Primary DNS Provider"
            clearable
            :disabled="!clusterIsNew"
            variant="underlined"
          >
            <template #item="{ item, props }">
              <v-list-item
                v-bind="props"
              >
                <template #prepend>
                  <g-vendor-icon :icon="item.raw.type"/>
                </template>
                <v-list-item-subtitle>
                  Type: {{item.raw.type}}
                </v-list-item-subtitle>
              </v-list-item>
            </template>
            <template #selection="{ item }">
              <g-vendor-icon :icon="item.raw.type"/>
              <span class="ml-2">
                {{item.raw.secretName}}
              </span>
            </template>
          </v-select>
        </v-col>
      </v-row>
      <v-row class="ma-0">
        <v-divider class="mx-3" />
      </v-row>
    </template>
    <div class="alternate-row-background">
      <v-expand-transition
        :appear="animateOnAppear"
        v-for="id in dnsProviderIds"
        :key="id"
      >
        <v-row class="list-item pt-2" :key="id">
          <g-dns-provider-row :dnsProviderId="id"/>
        </v-row>
      </v-expand-transition>
      <v-row key="addProvider" class="list-item pt-2">
        <v-col>
          <v-btn
            size="small"
            @click="addDnsProvider"
            variant="outlined"
            fab
            icon
            color="primary">
            <v-icon class="text-primary">mdi-plus</v-icon>
          </v-btn>
          <v-btn
            @click="addDnsProvider"
            variant="text"
            color="primary">
            Add DNS Provider
          </v-btn>
        </v-col>
      </v-row>
    </div>
  </v-container>
</template>

<script>
import { defineComponent } from 'vue'

import { mapState, mapActions } from 'pinia'
import { requiredIf } from '@vuelidate/validators'
import { useVuelidate } from '@vuelidate/core'

import GDnsProviderRow from '@/components/ShootDns/GDnsProviderRow'
import GVendorIcon from '@/components/GVendorIcon'
import { getValidationErrors } from '@/utils'
import { nilUnless } from '@/utils/validators'

import {
  useShootStagingStore,
} from '@/store'

export default defineComponent({
  setup () {
    return {
      v$: useVuelidate(),
    }
  },
  components: {
    GDnsProviderRow,
    GVendorIcon,
  },
  validations () {
    return this.validators
  },
  data () {
    return {
      animateOnAppear: false,
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
    validators () {
      return {
        primaryProvider: {
          required: requiredIf(!!this.domain),
          nil: nilUnless('domain'),
        },
      }
    },
    validationErrors () {
      return {
        primaryProvider: {
          required: 'Provider is required if a custom domain is defined',
          nil: 'Provider is not allowed if no custom domain is defined',
        },
      }
    },
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
  },
  methods: {
    ...mapActions(useShootStagingStore, [
      'addDnsProvider',
      'setDnsPrimaryProvider',
      'setDnsPrimaryProviderValid',
      'setDnsDomain',
    ]),
    getErrorMessages (field) {
      return getValidationErrors(this, field)
    },
  },
  mounted () {
    this.v$.$touch()
    this.animateOnAppear = true
  },
  watch: {
    'v$.primaryProvider.$invalid' (value) {
      this.setDnsPrimaryProviderValid(!value)
    },
  },
})
</script>

<style lang="scss" scoped>
  ::v-deep .v-select__slot {
    div {
     flex-wrap: nowrap;
    }
  }
</style>
