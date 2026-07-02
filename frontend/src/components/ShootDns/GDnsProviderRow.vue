<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div class="d-flex flex-nowrap align-center">
    <div class="d-flex flex-wrap">
      <div class="regular-input">
        <v-select
          v-model="v$.dnsProviderType.$model"
          color="primary"
          :items="dnsProviderTypes"
          :error-messages="getErrorMessages(v$.dnsProviderType)"
          label="Dns Provider Type"
          variant="underlined"
        >
          <template #item="{ props }">
            <v-list-item v-bind="props">
              <template #prepend>
                <g-vendor-icon
                  :name="props.value"
                  vendor-type="dns"
                />
              </template>
            </v-list-item>
          </template>
          <template #selection="{ item }">
            <div class="d-flex">
              <g-vendor-icon
                :name="item.title"
                vendor-type="dns"
                class="mr-2"
              />
              {{ item.title }}
            </div>
          </template>
        </v-select>
      </div>
      <div class="regular-input">
        <g-select-credential
          v-model="dnsProviderCredential"
          :provider-type="dnsProviderType"
          :filter-fn="credentialFilter"
          register-vuelidate-as="dnsProviderCredential"
        />
      </div>
      <div class="large-input">
        <v-combobox
          v-model="includeDomains"
          label="Include Domains"
          multiple
          chips
          closable-chips
          variant="underlined"
        />
      </div>
      <div class="large-input">
        <v-combobox
          v-model="excludeDomains"
          label="Exclude Domains"
          multiple
          chips
          closable-chips
          variant="underlined"
        />
      </div>
      <div class="large-input">
        <v-combobox
          v-model="includeZones"
          label="Include Zones"
          multiple
          chips
          closable-chips
          variant="underlined"
        />
      </div>
      <div class="large-input">
        <v-combobox
          v-model="excludeZones"
          label="Exclude Zones"
          multiple
          chips
          closable-chips
          variant="underlined"
        />
      </div>
    </div>
    <div class="ml-4 mr-2">
      <slot name="action" />
    </div>
  </div>
</template>

<script>
import { toRef } from 'vue'
import { mapState } from 'pinia'
import { required } from '@vuelidate/validators'
import { useVuelidate } from '@vuelidate/core'

import { useGardenerExtensionStore } from '@/store/gardenerExtension'
import { useCredentialStore } from '@/store/credential'
import { useCloudProfileStore } from '@/store/cloudProfile'

import GSelectCredential from '@/components/Credentials/GSelectCredential'
import GVendorIcon from '@/components/GVendorIcon'

import { useShootContext } from '@/composables/useShootContext'
import { useCloudProviderEntityList } from '@/composables/credential/useCloudProviderEntityList'
import { dnsExtensionProviderResourceName } from '@/composables/credential/helper'

import { getErrorMessages } from '@/utils'
import { withFieldName } from '@/utils/validators'

import set from 'lodash/set'
import find from 'lodash/find'
import head from 'lodash/head'
import get from 'lodash/get'

export default {
  components: {
    GSelectCredential,
    GVendorIcon,
  },
  props: {
    dnsProvider: {
      type: Object,
      required: true,
    },
  },
  setup (props) {
    const {
      isNewCluster,
      dnsServiceExtensionProviders,
      getDnsServiceExtensionResourceName,
      setResource,
      deleteResource,
      getResourceRef,
    } = useShootContext()

    const credentialStore = useCredentialStore()
    const gardenerExtensionStore = useGardenerExtensionStore()
    const cloudProfileStore = useCloudProfileStore()

    const dnsProviderType = toRef(props.dnsProvider, 'type')
    const dnsCloudProviderCredentials = useCloudProviderEntityList(dnsProviderType, { credentialStore, gardenerExtensionStore, cloudProfileStore })

    return {
      v$: useVuelidate(),
      isNewCluster,
      dnsServiceExtensionProviders,
      getDnsServiceExtensionResourceName,
      setResource,
      deleteResource,
      getResourceRef,
      dnsCloudProviderCredentials,
    }
  },
  validations () {
    return {
      dnsProviderType: withFieldName('DNS Provider Type', {
        required,
      }),
    }
  },
  computed: {
    ...mapState(useGardenerExtensionStore, [
      'dnsProviderTypes',
    ]),
    dnsProviderType: {
      get () {
        return this.dnsProvider?.type
      },
      set (value) {
        this.dnsProvider.type = value
        const allowedCloudProviderCredentials = this.dnsCloudProviderCredentials.filter(this.credentialFilter)
        const defaultDnsCredential = head(allowedCloudProviderCredentials)
        this.dnsProviderCredential = defaultDnsCredential
      },
    },
    dnsProviderCredential: {
      get () {
        const resourceName = dnsExtensionProviderResourceName(this.dnsProvider)
        const resourceRef = this.getResourceRef(resourceName)

        return find(this.dnsCloudProviderCredentials, credential => {
          return credential?.metadata?.name === resourceRef?.name &&
            credential?.kind === resourceRef?.kind
        })
      },
      set (credential) {
        const currentResourceName = dnsExtensionProviderResourceName(this.dnsProvider)
        this.deleteResource(currentResourceName)
        if (!credential) {
          this.dnsProvider.credentials = undefined
          this.dnsProvider.secretName = undefined
          return
        }
        const credentialKind = credential.kind
        const credentialName = credential.metadata?.name
        const newResourceName = this.getDnsServiceExtensionResourceName({
          kind: credentialKind,
          name: credentialName,
        })
        this.dnsProvider.credentials = newResourceName
        delete this.dnsProvider.secretName
        this.setResource({
          name: newResourceName,
          resourceRef: {
            apiVersion: credential.apiVersion,
            kind: credentialKind,
            name: credentialName,
          },
        })
      },
    },
    excludeDomains: {
      get () {
        return get(this.dnsProvider, ['domains', 'exclude'])
      },
      set (value) {
        set(this.dnsProvider, ['domains', 'exclude'], value)
      },
    },
    includeDomains: {
      get () {
        return get(this.dnsProvider, ['domains', 'include'])
      },
      set (value) {
        set(this.dnsProvider, ['domains', 'include'], value)
      },
    },
    excludeZones: {
      get () {
        return get(this.dnsProvider, ['zones', 'exclude'])
      },
      set (value) {
        set(this.dnsProvider, ['zones', 'exclude'], value)
      },
    },
    includeZones: {
      get () {
        return get(this.dnsProvider, ['zones', 'include'])
      },
      set (value) {
        set(this.dnsProvider, ['zones', 'include'], value)
      },
    },
    dnsExtensionProviderResourceRefs () {
      return this.dnsServiceExtensionProviders.map(provider => {
        const resourceName = dnsExtensionProviderResourceName(provider)
        return this.getResourceRef(resourceName)
      })
    },
  },
  mounted () {
    this.v$.$touch()
  },
  methods: {
    getErrorMessages,
    credentialFilter (credential) {
      const credentialName = credential?.metadata?.name
      const credentialKind = credential?.kind
      if (!credentialName || !credentialKind) {
        return false
      }
      const resourceName = dnsExtensionProviderResourceName(this.dnsProvider)
      const currentResourceRef = this.getResourceRef(resourceName)
      const matchesCredential = ref => ref?.name === credentialName && ref?.kind === credentialKind
      if (matchesCredential(currentResourceRef)) {
        return true
      }
      return !this.dnsExtensionProviderResourceRefs.some(matchesCredential)
    },
  },
}
</script>
