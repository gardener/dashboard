<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-row align="center">
    <v-tooltip top :disabled="!secretBindingMissing" open-delay="0">
      <template v-slot:activator="{ on }">
        <v-col cols="11" v-on="on">
          <div class="d-flex flex-wrap">
            <div class="regularInput">
              <v-select
                color="primary"
                item-color="primary"
                v-model="type"
                @blur="$v.type.$touch()"
                @input="onInputType"
                :items="dnsProviderTypes"
                :error-messages="getErrorMessages('type')"
                label="Dns Provider Type"
                :disabled="primary && !createMode"
                :hint="typeHint"
                persistent-hint
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
            </div>
            <div class="regularInput">
              <select-secret
                :dns-provider-kind="type"
                :selected-secret="secret"
                @update-secret="onUpdateSecret"
                @valid="onSecretValid"></select-secret>
            </div>
            <div class="regularInput">
              <v-combobox
                v-model="excludeDomains"
                label="Exclude Domains"
                multiple
                small-chips
                deletable-chips
                @input="onInputExcludeDomains"
              >
              </v-combobox>
            </div>
            <div class="regularInput">
              <v-combobox
                v-model="includeDomains"
                label="Include Domains"
                multiple
                small-chips
                deletable-chips
                @input="onInputIncludeDomains"
              >
              </v-combobox>
            </div>
            <div class="regularInput">
              <v-combobox
                v-model="excludeZones"
                label="Exclude Zones"
                multiple
                small-chips
                deletable-chips
                @input="onInputExcludeZones"
              >
              </v-combobox>
            </div>
            <div class="regularInput">
              <v-combobox
                v-model="includeZones"
                label="Include Zones"
                multiple
                small-chips
                deletable-chips
                @input="onInputIncludeZones"
              >
              </v-combobox>
            </div>
          </div>
        </v-col>
        <v-col cols="1">
          <v-btn
            small
            outlined
            icon
            color="grey"
            @click.native.stop="removeDnsProvider"
            :disabled="primary && !createMode">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-col>
      </template>
      <span class="font-weight-bold">You cannot edit this DNS Provider</span><br />
      SecretBinding for secret {{provider.secretName}} not found in poject namespace
    </v-tooltip>
  </v-row>
</template>

<script>
import SelectSecret from '@/components/SelectSecret'
import VendorIcon from '@/components/VendorIcon'
import { required } from 'vuelidate/lib/validators'
import { getValidationErrors } from '@/utils'
import { mapGetters } from 'vuex'
import find from 'lodash/find'
import head from 'lodash/head'
import map from 'lodash/map'

const validationErrors = {
  type: {
    required: 'DNS Provider Type is required'
  }
}

export default {
  name: 'dns-provider-row',
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
      includeZones: undefined,
      primary: false,
      createMode: false,
      secretBindingMissing: false
    }
  },
  validations: {
    type: {
      required
    }
  },
  computed: {
    ...mapGetters([
      'dnsSecretsByProviderKind',
      'sortedDnsProviderList'
    ]),
    dnsProviderTypes () {
      return map(this.sortedDnsProviderList, 'type')
    },
    typeHint () {
      if (this.primary && !this.createMode) {
        return 'Primary Provider type cannot be changed after cluster creation'
      }
      return undefined
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
      this.secret = find(this.dnsSecretsByProviderKind(this.provider.type), ['metadata.secretRef.name', this.provider.secretName])
      this.excludeDomains = this.provider.excludeDomains
      this.includeDomains = this.provider.includeDomains
      this.excludeZones = this.provider.excludeZones
      this.includeZones = this.provider.includeZones
      this.primary = this.provider.primary
      this.createMode = this.provider.createMode
    }
    if (!this.secret && !this.createMode) {
      this.secretBindingMissing = true
    }
    this.validateInput()
  }

}
</script>

<style lang="scss" scoped>

  ::v-deep .v-select__slot {
    div {
     flex-wrap: nowrap;
    }
  }

  .disabled-row {
    pointer-events: none;
    opacity: 0.5;
  }

  .regularInput {
    max-width: 300px;
    flex: 1 1 auto;
    padding: 12px;
  }

</style>
