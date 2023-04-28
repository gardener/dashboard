<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

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
            @blur="$v.primaryProvider.$touch()"
            :disabled="!clusterIsNew"
            :persistent-hint="!clusterIsNew"
            :hint="domainHint"
          ></v-text-field>
        </v-col>
        <v-col cols="4" v-show="primaryProviderVisible">
          <v-select
            color="primary"
            item-color="primary"
            v-model="primaryProvider"
            @blur="$v.primaryProvider.$touch()"
            @update:model-value="$v.primaryProvider.$touch()"
            :items="dnsProvidersWithPrimarySupport"
            :error-messages="getErrorMessages('primaryProvider')"
            label="Primary DNS Provider"
            clearable
            :disabled="!clusterIsNew"
          >
            <template v-slot:item="{ item }">
              <v-list-item-action>
                <vendor-icon :value="item.type"></vendor-icon>
              </v-list-item-action>
              <v-list-item-content>
                <v-list-item-title>{{item.secretName}}</v-list-item-title>
                <v-list-item-subtitle>
                  Type: {{item.type}}
                </v-list-item-subtitle>
              </v-list-item-content>
            </template>
            <template v-slot:selection="{ item }">
              <vendor-icon :value="item.type"></vendor-icon>
              <span class="ml-2">
                {{item.secretName}}
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
          <dns-provider-row :dnsProviderId="id"/>
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
import { mapState, mapGetters, mapActions, mapMutations } from 'vuex'
import { requiredIf } from 'vuelidate/lib/validators'

import DnsProviderRow from '@/components/ShootDns/DnsProviderRow.vue'
import VendorIcon from '@/components/VendorIcon.vue'
import { getValidationErrors } from '@/utils'
import { nilUnless } from '@/utils/validators'

const validations = {
  primaryProvider: {
    required: requiredIf('domain'),
    nil: nilUnless('domain')
  }
}

export default {
  name: 'manage-dns',
  components: {
    DnsProviderRow,
    VendorIcon
  },
  validations,
  data () {
    return {
      animateOnAppear: false
    }
  },
  computed: {
    ...mapState('shootStaging', [
      'dnsDomain',
      'dnsProviderIds'
    ]),
    ...mapGetters('shootStaging', [
      'clusterIsNew',
      'dnsProvidersWithPrimarySupport',
      'dnsPrimaryProvider'
    ]),
    validationErrors () {
      return {
        primaryProvider: {
          required: 'Provider is required if a custom domain is defined',
          nil: 'Provider is not allowed if no custom domain is defined'
        }
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
      }
    },
    primaryProvider: {
      get () {
        return this.dnsPrimaryProvider
      },
      set (value) {
        this.setDnsPrimaryProvider(value)
      }
    },
    primaryProviderVisible () {
      return !!this.primaryProvider || (this.clusterIsNew && !!this.dnsDomain)
    }
  },
  methods: {
    ...mapActions('shootStaging', [
      'setDnsDomain',
      'addDnsProvider'
    ]),
    ...mapMutations('shootStaging', [
      'setDnsPrimaryProvider',
      'setDnsPrimaryProviderValid'
    ]),
    getErrorMessages (field) {
      return getValidationErrors(this, field)
    }
  },
  mounted () {
    this.$v.$touch()
    this.animateOnAppear = true
  },
  watch: {
    '$v.primaryProvider.$invalid' (value) {
      this.setDnsPrimaryProviderValid(!value)
    }
  }
}
</script>

<style lang="scss" scoped>
  :deep(.v-select__slot) {
    div {
     flex-wrap: nowrap;
    }
  }
</style>
