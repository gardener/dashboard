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
          @blur="$v.primaryProvider.$touch()"
          @input="onInputDomain"
          :disabled="!createMode"
          :persistent-hint="!createMode"
          :hint="domainHint"
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
    <v-divider></v-divider>
    <transition-group name="list" class="alternate-row-background">
      <v-row v-for="(provider, index) in dnsProviders" :key="provider.id" class="list-item pt-2">
        <dns-provider-row
          :provider="provider"
          @type="onUpdateProviderType"
          @secret="onUpdateProviderSecret"
          @exclude-domains="onUpdateExcludeDomains"
          @include-domains="onUpdateIncludeDomains"
          @exclude-zones="onUpdateExcludeZones"
          @include-zones="onUpdateIncludeZones"
          @remove-dns-provider="onRemoveProvider(index)"
          @valid="onProviderValid">
        </dns-provider-row>
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
import DnsProviderRow from '@/components/ShootDns/DnsProviderRow'
import VendorIcon from '@/components/VendorIcon'
import { getValidationErrors, dnsProviderList } from '@/utils'
import { requiredIf } from 'vuelidate/lib/validators'
import { mapGetters, mapState, mapMutations } from 'vuex'
import { v4 as uuidv4 } from '@/utils/uuid'
import head from 'lodash/head'
import isEmpty from 'lodash/isEmpty'
import forEach from 'lodash/forEach'
import find from 'lodash/find'
import map from 'lodash/map'
import get from 'lodash/get'
import set from 'lodash/set'

const validations = {
  primaryProvider: {
    required: requiredIf(function () {
      return !isEmpty(this.domain)
    })
  }
}

export default {
  name: 'manage-dns',
  components: {
    DnsProviderRow,
    VendorIcon
  },
  props: {
    createMode: {
      type: Boolean,
      default: false
    }
  },
  data () {
    return {
      domain: undefined,
      primaryProvider: undefined,
      dnsProviders: [],
      valid: false
    }
  },
  validations,
  computed: {
    ...mapState('componentStates', { storedComponentState: 'manageDns' }),
    ...mapGetters([
      'dnsSecretsByProviderKind'
    ]),
    validationErrors () {
      return {
        primaryProvider: {
          required: 'Provider is required if a custom domain is defined'
        }
      }
    },
    domainHint () {
      if (this.createMode) {
        return 'External available domain of the cluster'
      }
      return 'Domain cannot be changed after cluster creation'
    }
  },
  methods: {
    ...mapMutations('componentStates', ['SET_MANAGE_DNS']),
    saveComponentState () {
      this.validateInput()
      const state = {
        domain: this.domain,
        providers: map(this.dnsProviders, dnsProvider => {
          const provider = {
            type: dnsProvider.type,
            secretName: dnsProvider.secretName,
            primary: this.primaryProvider === dnsProvider
          }
          if (dnsProvider.excludeDomains.length) {
            set(provider, 'domains.exclude', dnsProvider.excludeDomains.slice())
          }
          if (dnsProvider.includeDomains.length) {
            set(provider, 'domains.include', dnsProvider.includeDomains.slice())
          }
          if (dnsProvider.excludeZones.length) {
            set(provider, 'zones.exclude', dnsProvider.excludeZones.slice())
          }
          if (dnsProvider.includeZones.length) {
            set(provider, 'zones.include', dnsProvider.includeZones.slice())
          }
          return provider
        }),
        valid: this.valid
      }
      this.SET_MANAGE_DNS(state)
    },
    getErrorMessages (field) {
      return getValidationErrors(this, field)
    },
    addProvider () {
      const id = uuidv4()
      const type = head(dnsProviderList)
      const secretName = get(head(this.dnsSecretsByProviderKind(type)), 'metadata.name')
      const excludeDomains = []
      const includeDomains = []
      const excludeZones = []
      const includeZones = []
      const valid = false
      this.dnsProviders.push({ type, secretName, excludeDomains, includeDomains, excludeZones, includeZones, id, valid })
      this.saveComponentState()
    },
    onRemoveProvider (index) {
      this.dnsProviders.splice(index, 1)
      this.saveComponentState()
    },
    onProviderValid ({ valid, id }) {
      const provider = find(this.dnsProviders, { id })
      provider.valid = valid
      this.saveComponentState()
    },
    onInputPrimaryProvider () {
      this.$v.primaryProvider.$touch()
      this.saveComponentState()
    },
    onInputDomain () {
      this.saveComponentState()
    },
    onUpdateProviderType ({ type, id }) {
      const provider = find(this.dnsProviders, { id })
      provider.type = type
      this.saveComponentState()
    },
    onUpdateProviderSecret ({ secret, id }) {
      const provider = find(this.dnsProviders, { id })
      provider.secretName = get(secret, 'metadata.name')
      this.saveComponentState()
    },
    onUpdateExcludeDomains ({ excludeDomains, id }) {
      const provider = find(this.dnsProviders, { id })
      provider.excludeDomains = excludeDomains
      this.saveComponentState()
    },
    onUpdateIncludeDomains ({ includeDomains, id }) {
      const provider = find(this.dnsProviders, { id })
      provider.includeDomains = includeDomains
      this.saveComponentState()
    },
    onUpdateExcludeZones ({ excludeZones, id }) {
      const provider = find(this.dnsProviders, { id })
      provider.excludeZones = excludeZones
      this.saveComponentState()
    },
    onUpdateIncludeZones ({ includeZones, id }) {
      const provider = find(this.dnsProviders, { id })
      provider.includeZones = includeZones
      this.saveComponentState()
    },
    validateInput () {
      let valid = true
      forEach(this.dnsProviders, provider => {
        if (!provider.valid) {
          valid = false
        }
      })

      this.valid = !this.$v.$invalid && valid
    }
  },
  mounted () {
    const { domain, providers } = this.storedComponentState
    this.domain = domain
    this.dnsProviders = map(providers, provider => {
      return {
        type: provider.type,
        secretName: provider.secretName,
        excludeDomains: get(provider, 'domains.exclude', []).slice(),
        includeDomains: get(provider, 'domains.include', []).slice(),
        excludeZones: get(provider, 'zones.exclude', []).slice(),
        includeZones: get(provider, 'zones.include', []).slice(),
        id: uuidv4(),
        primary: provider.primary,
        createMode: this.createMode
      }
    })
    const primaryProvider = find(providers, ['primary', true])
    if (primaryProvider) {
      this.primaryProvider = find(this.dnsProviders, { type: primaryProvider.type, secretName: primaryProvider.secretName })
    }
    this.saveComponentState()
  }
}
</script>

<style scoped>

</style>
