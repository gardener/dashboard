<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-row align="center">
    <v-col cols="11">
      <v-row class="ma-0">
        <v-col>
          <v-select
            color="primary"
            item-color="primary"
            v-model="type"
            @blur="$v.type.$touch()"
            @input="onInputType"
            :items="dnsProviderList"
            :error-messages="getErrorMessages('type')"
            label="Dns Provider Type"
          >
            <template v-slot:item="{ item }">
              <v-list-item-action>
                <vendor-icon :value="item"></vendor-icon>
              </v-list-item-action>
              <v-list-item-content>
                <v-list-item-title>{{item}}</v-list-item-title>
              </v-list-item-content>
            </template>
            <template v-slot:selection="{ item }">
              <vendor-icon :value="item"></vendor-icon>
              <span class="ml-2">
              {{item}}
              </span>
            </template>
          </v-select>
        </v-col>
        <v-col>
          <select-secret
            :dns-provider-kind="type"
            :selected-secret="secret"
            @update-secret="onUpdateSecret"
            @valid="onSecretValid"></select-secret>
        </v-col>
        <v-col>
          <v-combobox
            v-model="excludeDomains"
            label="Exclude Domains"
            multiple
            small-chips
            @input="onInputExcludeDomains"
          >
          </v-combobox>
        </v-col>
        <v-col>
          <v-combobox
            v-model="includeDomains"
            label="Include Domains"
            multiple
            small-chips
            @input="onInputIncludeDomains"
          >
          </v-combobox>
        </v-col>
        <v-col>
          <v-combobox
            v-model="excludeZones"
            label="Exclude Zones"
            multiple
            small-chips
            @input="onInputExcludeZones"
          >
          </v-combobox>
        </v-col>
        <v-col>
          <v-combobox
            v-model="includeZones"
            label="Include Zones"
            multiple
            small-chips
            @input="onInputIncludeZones"
          >
          </v-combobox>
        </v-col>
      </v-row>
    </v-col>
    <v-col cols="1">
      <v-btn
        small
        outlined
        icon
        color="grey"
        @click.native.stop="removeDnsProvider">
        <v-icon>mdi-close</v-icon>
      </v-btn>
    </v-col>
  </v-row>
</template>

<script>
import SelectSecret from '@/components/SelectSecret'
import VendorIcon from '@/components/VendorIcon'
import { required } from 'vuelidate/lib/validators'
import { getValidationErrors, dnsProviderList } from '@/utils'
import { mapGetters } from 'vuex'
import find from 'lodash/find'
import head from 'lodash/head'

const validationErrors = {
  type: {
    required: 'DNS Provider Type is required'
  }
}

export default {
  name: 'dns-provider',
  components: {
    SelectSecret,
    VendorIcon
  },
  props: {
    provider: {
      type: Object,
      required: true
    }
  },
  data () {
    return {
      validationErrors,
      secretValid: false,
      id: undefined,
      type: undefined,
      secret: undefined,
      excludeDomains: undefined,
      includeDomains: undefined,
      excludeZones: undefined,
      includeZones: undefined
    }
  },
  validations: {
    type: {
      required
    }
  },
  computed: {
    ...mapGetters([
      'dnsSecretsByProviderKind'
    ]),
    dnsProviderList () {
      return dnsProviderList
    }
  },
  methods: {
    getErrorMessages (field) {
      return getValidationErrors(this, field)
    },
    onInputType () {
      this.$v.type.$touch()
      this.$emit('type', { id: this.id, type: this.type })
      const secret = head(this.dnsSecretsByProviderKind(this.type))
      this.onUpdateSecret(secret)
    },
    onUpdateSecret (secret) {
      this.secret = secret
      this.validateInput()
      this.$emit('secret', { id: this.id, secret: this.secret })
    },
    onInputExcludeDomains () {
      this.$emit('exclude-domains', { id: this.id, excludeDomains: this.excludeDomains })
    },
    onInputIncludeDomains () {
      this.$emit('include-domains', { id: this.id, includeDomains: this.includeDomains })
    },
    onInputExcludeZones () {
      this.$emit('exclude-zones', { id: this.id, excludeZones: this.excludeZones })
    },
    onInputIncludeZones () {
      this.$emit('include-zones', { id: this.id, includeZones: this.includeZones })
    },
    onSecretValid (valid) {
      if (this.secretValid !== valid) {
        this.secretValid = valid
        this.validateInput()
      }
    },
    validateInput () {
      const valid = this.secretValid && !this.$v.$invalid
      if (this.valid !== valid) {
        this.valid = valid
        this.$emit('valid', { id: this.id, valid: this.valid })
      }
    },
    removeDnsProvider () {
      this.$emit('remove-dns-provider')
    }
  },
  mounted () {
    if (this.provider) {
      this.id = this.provider.id
      this.type = this.provider.type
      this.secret = find(this.dnsSecretsByProviderKind(this.provider.type), ['metadata.name', this.provider.secretName])
      this.excludeDomains = this.provider.excludeDomains
      this.includeDomains = this.provider.includeDomains
      this.excludeZones = this.provider.excludeZones
      this.includeZones = this.provider.includeZones
    }
    this.validateInput()
  }
}
</script>

<style lang="scss" scoped>

</style>
