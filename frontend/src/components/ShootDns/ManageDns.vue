<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-container class="pa-0 ma-0">
    <v-row>
      <v-col cols="3">
        <v-text-field
          color="primary"
          label="Cluster Domain"
          v-model="domain"
          :error-messages="getErrorMessages('domain')"
          @blur="$v.domain.$touch()"
          @input="onInputDomain"
          hint="External available domain of the cluster"
        ></v-text-field>
      </v-col>
      <v-col cols="3">
        <v-select
          color="primary"
          item-color="primary"
          v-model="primaryProvider"
          @blur="$v.primaryProvider.$touch()"
          @input="onInputPrimaryProvider"
          :items="dnsProviders"
          :error-messages="getErrorMessages('primaryProvider')"
          label="Primary DNS Provider"
        >
          <template v-slot:item="{ item }">
            <v-list-item-action>
              <vendor-icon :value="item.type"></vendor-icon>
            </v-list-item-action>
            <v-list-item-content>
              <v-list-item-title>{{item.secret}}</v-list-item-title>
              <v-list-item-subtitle>
                Type: {{item.type}}
              </v-list-item-subtitle>
            </v-list-item-content>
          </template>
          <template v-slot:selection="{ item }">
            <vendor-icon :value="item.type"></vendor-icon>
            <span class="ml-2">
              {{item.secret}}
            </span>
          </template>
        </v-select>
      </v-col>
    </v-row>
    <transition-group name="list" class="alternate-row-background">
      <v-row v-for="(provider, index) in dnsProviders" :key="provider.id"  class="list-item pt-2">
        <dns-provider
          :provider="provider"
          @secret="onUpdateProviderSecret"
          @exclude-domains="onUpdateExcludeDomains"
          @include-domains="onUpdateIncludeDomains"
          @exclude-zones="onUpdateExcludeZones"
          @include-zones="onUpdateIncludeZones"
          @remove-dns-provider="onRemoveProvider(index)"
          @valid="onProviderValid">
        </dns-provider>
      </v-row>
      <v-row key="addProvider" class="list-item">
        <v-col>
          <v-btn
            small
            @click="addProvider"
            outlined
            fab
            icon
            color="primary">
            <v-icon class="primary--text">mdi-plus</v-icon>
          </v-btn>
          <v-btn
            @click="addProvider"
            text
            color="primary">
            Add DNS Provider
          </v-btn>
        </v-col>
      </v-row>
    </transition-group>
  </v-container>
</template>

<script>
import DnsProvider from '@/components/ShootDns/DnsProvider'
import VendorIcon from '@/components/VendorIcon'
import { getValidationErrors, dnsProviderList } from '@/utils'
import { required, requiredIf } from 'vuelidate/lib/validators'
import { mapGetters } from 'vuex'
import { v4 as uuidv4 } from '@/utils/uuid'
import head from 'lodash/head'
import isEmpty from 'lodash/isEmpty'
import forEach from 'lodash/forEach'
import find from 'lodash/find'

const validations = {
  domain: {
    required
  },
  primaryProvider: {
    required: requiredIf(function () {
      return !isEmpty(this.domain)
    })
  }
}

export default {
  name: 'manage-dns',
  components: {
    DnsProvider,
    VendorIcon
  },
  data () {
    return {
      domain: undefined,
      primaryProvider: undefined,
      dnsProviders: []
    }
  },
  validations,
  computed: {
    ...mapGetters([
      'dnsSecretsByProviderKind'
    ]),
    validationErrors () {
      return {
        domain: {
          required: 'Domain is required'
        },
        primaryProvider: {
          required: 'Provider is required if a custom domain is defined'
        }
      }
    }
  },
  methods: {
    getErrorMessages (field) {
      return getValidationErrors(this, field)
    },
    addProvider () {
      const id = uuidv4()
      const type = head(dnsProviderList)
      const secret = head(this.dnsSecretsByProviderKind(type))
      const excludeDomains = []
      const includeDomains = []
      const excludeZones = []
      const includeZones = []
      const valid = false
      this.dnsProviders.push({ type, secret, excludeDomains, includeDomains, excludeZones, includeZones, id, valid })
    },
    onRemoveProvider (index) {
      this.dnsProviders.splice(index, 1)
      this.validateInput()
    },
    onProviderValid ({ valid, id }) {
      const provider = find(this.dnsProviders, { id })
      provider.valid = valid
      this.validateInput()
    },
    onInputPrimaryProvider () {
      this.$v.primaryProvider.$touch()
      this.validateInput()
    },
    onInputDomain () {
      this.validateInput()
      this.$v.domain.$touch()
    },
    onUpdateProviderType ({ type, id }) {
      const provider = find(this.dnsProviders, { id })
      provider.type = type
    },
    onUpdateProviderSecret ({ secret, id }) {
      const provider = find(this.dnsProviders, { id })
      provider.secret = secret
    },
    onUpdateExcludeDomains ({ excludeDomains, id }) {
      const provider = find(this.dnsProviders, { id })
      provider.excludeDomains = excludeDomains
    },
    onUpdateIncludeDomains ({ includeDomains, id }) {
      const provider = find(this.dnsProviders, { id })
      provider.includeDomains = includeDomains
    },
    onUpdateExcludeZones ({ excludeZones, id }) {
      const provider = find(this.dnsProviders, { id })
      provider.excludeZones = excludeZones
    },
    onUpdateIncludeZones ({ includeZones, id }) {
      const provider = find(this.dnsProviders, { id })
      provider.includeZones = includeZones
    },
    validateInput () {
      let valid = true
      forEach(this.dnsProviders, provider => {
        if (!provider.valid) {
          valid = false
        }
      })

      this.valid = !this.$v.invalid && valid
    }
  }
}
</script>

<style scoped>

</style>
