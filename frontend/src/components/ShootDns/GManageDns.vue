<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-container class="px-0 mx-0">
    <v-row>
      <v-checkbox
        v-model="customDomainEnabled"
        label="Configure Cluster Domain"
        color="primary"
        :disabled="!isNewCluster"
        density="compact"
        persistent-hint
        :hint="domainCheckboxHint"
        max-width="50%"
        class="mb-3 mx-3"
      />
    </v-row>
    <template v-if="customDomainEnabled">
      <v-row>
        <v-col cols="6">
          <v-text-field
            ref="dnsDomainRef"
            v-model="dnsDomain"
            :error-messages="getErrorMessages(v$.dnsDomain)"
            color="primary"
            label="Cluster Domain"
            :disabled="!isNewCluster || !customDomainEnabled"
            persistent-hint
            :hint="domainHint"
            variant="underlined"
            @blur="v$.dnsDomain.$touch()"
          />
        </v-col>
        <v-col cols="3">
          <v-select
            v-model="v$.dnsPrimaryProviderType.$model"
            color="primary"
            :items="dnsProviderTypesWithPrimarySupport"
            :error-messages="getErrorMessages(v$.dnsPrimaryProviderType)"
            label="Primary DNS Provider Type"
            :disabled="!isNewCluster"
            :persistent-hint="!isNewCluster"
            :hint="typeHint"
            variant="underlined"
          >
            <template #item="{ props }">
              <v-list-item v-bind="props">
                <template #prepend>
                  <g-vendor-icon :icon="props.value" />
                </template>
              </v-list-item>
            </template>
            <template #selection="{ item }">
              <div class="d-flex">
                <g-vendor-icon
                  :icon="item.value"
                  class="mr-2"
                />
                {{ item.value }}
              </div>
            </template>
          </v-select>
        </v-col>
        <v-col cols="3">
          <g-select-credential
            v-model="primaryDnsProviderCredential"
            :provider-type="dnsPrimaryProviderType"
            register-vuelidate-as="dnsProviderCredential"
            label="Primary DNS Provider Credential"
          />
        </v-col>
      </v-row>
    </template>
    <v-row v-if="domainRecommendationVisible">
      <v-col>
        <v-alert
          variant="tonal"
          type="info"
          color="primary"
          max-width="50%"
        >
          <div>
            To manage DNS entries for your cluster domain, add a DNS provider for the <code>shoot-dns-service</code> extension.<br>
            Click the <span class="font-weight-bold">Apply</span> button below to configure a provider for the <code>shoot-dns-service</code> extension using your cluster domain as the included domain.
          </div>
          <v-btn
            class="mt-3"
            size="small"
            color="primary"
            @click="addDnsServiceExtensionProviderForCustomDomain"
          >
            Apply
          </v-btn>
        </v-alert>
      </v-col>
    </v-row>
    <template v-if="hasDnsServiceExtension">
      <div class="text-subtitle-1 my-3">
        DNS Providers for the shoot-dns-service Extension
      </div>
      <div class="text-caption">
        Configure DNS providers for the shoot-dns-service extension to automatically manage and synchronize DNS entries for cluster resources like services and ingresses
      </div>
      <div class="alternate-row-background">
        <v-expand-transition group>
          <v-row
            v-for="(extensionDnsProvider, index) in dnsServiceExtensionProviders"
            :key="index"
            class="list-item pt-2"
          >
            <g-dns-provider-row :dns-provider="extensionDnsProvider">
              <template #action>
                <v-btn
                  size="x-small"
                  variant="tonal"
                  icon="mdi-close"
                  color="grey"
                  @click="deleteDnsServiceExtensionProvider(index)"
                />
              </template>
            </g-dns-provider-row>
          </v-row>
        </v-expand-transition>
        <v-row
          key="addProvider"
          class="list-item my-1"
        >
          <v-col>
            <v-btn
              variant="text"
              color="primary"
              @click="addDnsServiceExtensionProvider()"
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
  </v-container>
</template>

<script>
import { requiredIf } from '@vuelidate/validators'
import { useVuelidate } from '@vuelidate/core'
import { mapState } from 'pinia'
import { ref } from 'vue'

import { useGardenerExtensionStore } from '@/store/gardenerExtension'
import { useCredentialStore } from '@/store/credential'
import { useCloudProfileStore } from '@/store/cloudProfile'

import GSelectCredential from '@/components/Credentials/GSelectCredential'
import GDnsProviderRow from '@/components/ShootDns/GDnsProviderRow'
import GVendorIcon from '@/components/GVendorIcon'

import { useShootContext } from '@/composables/useShootContext'
import { useCloudProviderEntityList } from '@/composables/credential/useCloudProviderEntityList'

import {
  withFieldName,
  withMessage,
} from '@/utils/validators'
import { getErrorMessages } from '@/utils'

import head from 'lodash/head'
import find from 'lodash/find'

export default {
  components: {
    GDnsProviderRow,
    GVendorIcon,
    GSelectCredential,
  },
  setup () {
    const {
      dnsDomain,
      dnsPrimaryProviderType,
      dnsPrimaryProviderSecretName,
      isNewCluster,
      dnsServiceExtensionProviders,
      hasDnsServiceExtensionProviderForCustomDomain,
      addDnsServiceExtensionProvider,
      addDnsServiceExtensionProviderForCustomDomain,
      resetDnsPrimaryProvider,
      deleteDnsServiceExtensionProvider,
    } = useShootContext()

    const credentialStore = useCredentialStore()
    const gardenerExtensionStore = useGardenerExtensionStore()
    const cloudProfileStore = useCloudProfileStore()

    const customDomain = ref(!!dnsDomain.value && !!dnsPrimaryProviderType.value)
    const dnsPrimaryProviderCredentials = useCloudProviderEntityList(dnsPrimaryProviderType, { credentialStore, gardenerExtensionStore, cloudProfileStore })

    return {
      v$: useVuelidate(),
      dnsDomain,
      dnsPrimaryProviderType,
      dnsPrimaryProviderSecretName,
      isNewCluster,
      dnsServiceExtensionProviders,
      hasDnsServiceExtensionProviderForCustomDomain,
      addDnsServiceExtensionProvider,
      addDnsServiceExtensionProviderForCustomDomain,
      resetDnsPrimaryProvider,
      deleteDnsServiceExtensionProvider,
      customDomain,
      dnsPrimaryProviderCredentials,
    }
  },
  validations () {
    return {
      dnsPrimaryProviderType: withFieldName('Primary DNS Provider Type', {
        required: withMessage('Provider type is required if a cluster domain is defined', requiredIf(this.isNewCluster && !!this.dnsDomain)),
      }),
      primaryDnsProviderCredential: withFieldName('Primary DNS Provider Secret', {
        required: withMessage('Provider secret is required if a cluster domain is defined', requiredIf(this.isNewCluster && !!this.dnsDomain)),
      }),
      dnsDomain: withFieldName('Custom Cluster Domain', {
        required: withMessage('If cluster domain is enabled, you need to define a cluster domain', requiredIf(this.customDomainEnabled)),
      }),
    }
  },
  computed: {
    ...mapState(useGardenerExtensionStore, [
      'dnsProviderTypesWithPrimarySupport',
      'hasDnsServiceExtension',
    ]),
    domainHint () {
      if (!this.isNewCluster) {
        return 'Domain cannot be changed after cluster creation'
      }
      return `Configure domain of the cluster (API server will be reachable under api.${this.dnsDomain ? this.dnsDomain : '<custom-domain>'})`
    },
    domainCheckboxHint () {
      if (!this.isNewCluster) {
        return 'Cluster domain cannot be changed after cluster creation'
      }
      return 'Configure cluster domain using the primary DNS provider. This domain will be used for the API server of this cluster. If you do not configure a cluster domain, Gardener will automatically assign a generated domain to your cluster.'
    },
    typeHint () {
      return this.isNewCluster
        ? ''
        : 'Primary DNS Provider Type cannot be changed after cluster creation'
    },
    customDomainEnabled: {
      get () {
        return this.customDomain
      },
      set (value) {
        this.customDomain = value

        if (!value) {
          this.dnsDomain = undefined
          this.resetDnsPrimaryProvider()
        } else {
          this.$nextTick(() => this.$refs.dnsDomainRef.focus())
        }
      },
    },
    primaryDnsProviderCredential: {
      get () {
        return find(this.dnsPrimaryProviderCredentials, credential => {
          return credential?.metadata?.name === this.dnsPrimaryProviderSecretName
        })
      },
      set (credential) {
        this.dnsPrimaryProviderSecretName = credential?.metadata?.name
      },
    },
    domainRecommendationVisible () {
      if (!this.dnsDomain) {
        return false
      }
      if (!this.dnsPrimaryProviderType) {
        return false
      }
      if (!this.primaryDnsProviderCredential) {
        return false
      }
      if (!this.hasDnsServiceExtension) {
        return false
      }
      return !this.hasDnsServiceExtensionProviderForCustomDomain
    },
  },
  watch: {
    customDomainEnabled (value) {
      if (value) {
        const type = head(this.dnsProviderTypesWithPrimarySupport)
        this.dnsPrimaryProviderType = type
        this.primaryDnsProviderCredential = head(this.dnsPrimaryProviderCredentials)
        this.v$.dnsDomain.$reset()
      }
    },
  },
  methods: {
    getErrorMessages,
  },
}
</script>
