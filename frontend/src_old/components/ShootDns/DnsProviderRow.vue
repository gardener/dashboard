<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div>
    <!-- do not wrap v-row with tooltip component as this breaks expand (appear) animation -->
    <v-tooltip location="top" :disabled="!readonly" open-delay="0" :activator="$refs.dnsrow">
      <span class="font-weight-bold">You cannot edit this DNS Provider</span><br />
      SecretBinding for secret {{secretName}} not found in poject namespace
    </v-tooltip>
    <v-row align="center" class="ma-0" ref="dnsrow">
      <v-col cols="11">
        <div class="d-flex flex-wrap">
          <div class="regular-input">
            <v-select
              :disabled="readonly || primaryReadonly"
              color="primary"
              item-color="primary"
              v-model="type"
              @blur="$v.type.$touch()"
              @input="$v.type.$touch()"
              :items="dnsProviderTypes"
              :error-messages="getErrorMessages('type')"
              label="Dns Provider Type"
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
          <div class="regular-input">
            <select-secret
              :disabled="readonly"
              :dns-provider-kind="type"
              v-model="secret"
              v-model:valid="secretValid">
            </select-secret>
          </div>
          <div class="regular-input">
            <v-combobox
              :disabled="readonly"
              v-model="excludeDomains"
              label="Exclude Domains"
              multiple
              small-chips
              deletable-chips
            >
            </v-combobox>
          </div>
          <div class="regular-input">
            <v-combobox
              :disabled="readonly"
              v-model="includeDomains"
              label="Include Domains"
              multiple
              small-chips
              deletable-chips
            >
            </v-combobox>
          </div>
          <div class="regular-input">
            <v-combobox
              :disabled="readonly"
              v-model="excludeZones"
              label="Exclude Zones"
              multiple
              small-chips
              deletable-chips
            >
            </v-combobox>
          </div>
          <div class="regular-input">
            <v-combobox
              :disabled="readonly"
              v-model="includeZones"
              label="Include Zones"
              multiple
              small-chips
              deletable-chips
            >
            </v-combobox>
          </div>
        </div>
      </v-col>
      <v-col cols="1">
        <v-btn
          :disabled="readonly || primaryReadonly"
          size="small"
          variant="outlined"
          icon
          color="grey"
          @click="onDelete">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-col>
    </v-row>
  </div>
</template>

<script>
import { mapState, mapGetters, mapMutations } from 'vuex'
import { required } from 'vuelidate/lib/validators'
import get from 'lodash/get'
import head from 'lodash/head'
import find from 'lodash/find'

import SelectSecret from '@/components/SelectSecret.vue'
import VendorIcon from '@/components/VendorIcon.vue'
import { getValidationErrors } from '@/utils'

const validations = {
  type: {
    required
  }
}

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
  validations,
  props: {
    dnsProviderId: {
      type: String,
      required: true
    }
  },
  data () {
    return {
      validationErrors,
      secretValid: true
    }
  },
  computed: {
    ...mapState('shootStaging', {
      dnsProvider (state) {
        return state.dnsProviders[this.dnsProviderId]
      },
      primary (state) {
        return state.dnsPrimaryProviderId === this.dnsProviderId
      }
    }),
    ...mapGetters('shootStaging', [
      'clusterIsNew',
      'dnsProviderTypes',
      'getDnsProviderSecrets'
    ]),
    dnsSecrets () {
      return this.getDnsProviderSecrets(this.type)
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
        const defaultDnsSecret = head(this.getDnsProviderSecrets(value))
        this.setData({
          type: value,
          secretName: get(defaultDnsSecret, 'metadata.secretRef.name', null)
        })
      }
    },
    secretName: {
      get () {
        return get(this.dnsProvider, 'secretName')
      },
      set (value) {
        this.setData({ secretName: value })
      }
    },
    secret: {
      get () {
        return find(this.dnsSecrets, ['metadata.secretRef.name', this.secretName])
      },
      set (value) {
        this.secretName = get(value, 'metadata.secretRef.name', null)
      }
    },
    includeDomains: {
      get () {
        return get(this.dnsProvider, 'includeDomains', [])
      },
      set (value = []) {
        this.setData({ includeDomains: value })
      }
    },
    excludeDomains: {
      get () {
        return get(this.dnsProvider, 'excludeDomains', [])
      },
      set (value = []) {
        this.setData({ excludeDomains: value })
      }
    },
    includeZones: {
      get () {
        return get(this.dnsProvider, 'includeZones', [])
      },
      set (value = []) {
        this.setData({ includeZones: value })
      }
    },
    excludeZones: {
      get () {
        return get(this.dnsProvider, 'excludeZones', [])
      },
      set (value = []) {
        this.setData({ excludeZones: value })
      }
    },
    valid () {
      return get(this.dnsProvider, 'valid')
    }
  },
  methods: {
    ...mapMutations('shootStaging', [
      'patchDnsProvider',
      'deleteDnsProvider'
    ]),
    setData (data) {
      this.patchDnsProvider({
        id: this.dnsProviderId,
        ...data
      })
    },
    updateValid () {
      const valid = this.secretValid && !this.$v.$invalid
      if (this.valid !== valid && !this.readonly) {
        this.setData({ valid })
      }
    },
    getErrorMessages (field) {
      return getValidationErrors(this, field)
    },
    onDelete () {
      this.deleteDnsProvider(this.dnsProviderId)
    }
  },
  mounted () {
    this.$v.$touch()
  },
  watch: {
    '$v.$invalid' () {
      this.updateValid()
    },
    secretValid () {
      this.updateValid()
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

  .regular-input {
    width: 250px;
    max-width: 300px;
    flex: 1 1 auto;
    padding: 12px;
  }

</style>
