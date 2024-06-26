<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-container class="px-0 mx-0">
    <v-row>
      <v-checkbox
        v-model="customDomainEnabled"
        label="Custom Domain"
        color="primary"
        :disabled="!isNewCluster"
        density="compact"
        persistent-hint
        :hint="domainCheckboxHint"
        class="mb-3 mx-3"
        hide-details="auto"
      />
    </v-row>
    <template v-if="customDomainEnabled">
      <v-row class="my-0">
        <v-col cols="6">
          <v-text-field
            ref="dnsDomainRef"
            v-model="dnsDomain"
            :error-messages="getErrorMessages(v$.dnsDomain)"
            color="primary"
            label="Custom Domain"
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
          <g-select-secret
            v-model="primaryDnsProviderSecret"
            :dns-provider-kind="dnsPrimaryProviderType"
            register-vuelidate-as="dnsProviderSecret"
            label="Primary DNS Provider Secret"
          />
        </v-col>
      </v-row>
    </template>
    <v-row v-if="domainRecommendationVisible">
      <v-col>
        <v-alert
          variant="tonal"
          type="info"
        >
          <div class="d-flex align-center">
            <div>
              The primary DNS provider is used for Gardener internal purposes only.
              The DNS providers for the shoot-dns-service extension are configured separately.
              Click the button to apply the recommended configuration for the shoot-dns-service.
              This will configure a provider for the <code>shoot-dns-service</code> extension with your custom domain as <code>include</code> domain.
            </div>
            <div>
              <v-btn
                class="ma-3"
                size="small"
                color="info"
                height="40px"
                @click="addDnsServiceExtensionProviderForCustomDomain"
              >
                Apply Recommended<br>
                DNS Configuration
              </v-btn>
            </div>
          </div>
        </v-alert>
      </v-col>
    </v-row>
    <template v-if="hasDnsServiceExtension">
      <v-divider class="my-3" />
      <div class="wrap-text text-subtitle-2">
        DNS Providers for the <code>shoot-dns-service</code> Extension
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
import {
  mapState,
  mapActions,
} from 'pinia'

import { useGardenerExtensionStore } from '@/store/gardenerExtension'
import { useSecretStore } from '@/store/secret'

import GSelectSecret from '@/components/Secrets/GSelectSecret'
import GDnsProviderRow from '@/components/ShootDns/GDnsProviderRow'
import GVendorIcon from '@/components/GVendorIcon'

import { useShootContext } from '@/composables/useShootContext'

import {
  withFieldName,
  withMessage,
} from '@/utils/validators'
import { getErrorMessages } from '@/utils'

import {
  find,
  head,
} from '@/lodash'

export default {
  components: {
    GDnsProviderRow,
    GVendorIcon,
    GSelectSecret,
  },
  setup () {
    const {
      dnsDomain,
      dnsPrimaryProviderType,
      dnsPrimaryProviderSecretName,
      isNewCluster,
      dnsProvidersWithPrimarySupport,
      dnsServiceExtensionProviders,
      hasDnsServiceExtensionProviderForCustomDomain,
      addDnsServiceExtensionProvider,
      addDnsServiceExtensionProviderForCustomDomain,
      resetDnsPrimaryProvider,
      deleteDnsServiceExtensionProvider,
    } = useShootContext()

    return {
      v$: useVuelidate(),
      dnsDomain,
      dnsPrimaryProviderType,
      dnsPrimaryProviderSecretName,
      isNewCluster,
      dnsProvidersWithPrimarySupport,
      dnsServiceExtensionProviders,
      hasDnsServiceExtensionProviderForCustomDomain,
      addDnsServiceExtensionProvider,
      addDnsServiceExtensionProviderForCustomDomain,
      resetDnsPrimaryProvider,
      deleteDnsServiceExtensionProvider,
    }
  },
  validations () {
    return {
      dnsPrimaryProviderType: withFieldName('Primary DNS Provider Type', {
        required: withMessage('Provider type is required if a custom domain is defined', requiredIf(this.isNewCluster && !!this.dnsDomain)),
      }),
      primaryDnsProviderSecret: withFieldName('Primary DNS Provider Secret', {
        required: withMessage('Provider secret is required if a custom domain is defined', requiredIf(this.isNewCluster && !!this.dnsDomain)),
      }),
      dnsDomain: withFieldName('Custom Cluster Domain', {
        required: withMessage('If custom domain is enabled, you need to define a cluster domain', requiredIf(this.customDomainEnabled)),
      }),
    }
  },
  data () {
    return {
      customDomain: false,
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
      return `Define custom domain of the cluster (API server will be reachable under api.${this.dnsDomain ? this.dnsDomain : '<custom-domain>'})`
    },
    domainCheckboxHint () {
      if (!this.isNewCluster) {
        return 'Custom domain cannot be changed after cluster creation'
      }
      return 'Configure custom domain using the primary DNS provider. This domain will be used for the API server of this cluster'
    },
    typeHint () {
      return this.isNewCluster
        ? ''
        : 'Primary DNS Provider Type cannot be changed after cluster creation'
    },
    customDomainEnabled: {
      get () {
        return this.customDomain ||
          (!!this.dnsDomain && !!this.dnsPrimaryProviderType)
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
    primaryDnsProviderSecret: {
      get () {
        const dnsSecrets = this.dnsSecretsByProviderKind(this.dnsPrimaryProviderType)
        return find(dnsSecrets, ['metadata.secretRef.name', this.dnsPrimaryProviderSecretName])
      },
      set (value) {
        this.dnsPrimaryProviderSecretName = value?.metadata.secretRef.name
      },
    },
    domainRecommendationVisible () {
      if (!this.dnsDomain) {
        return false
      }
      if (!this.dnsPrimaryProviderType) {
        return false
      }
      if (!this.primaryDnsProviderSecret) {
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
        const dnsSecrets = this.dnsSecretsByProviderKind(type)
        this.primaryDnsProviderSecret = head(dnsSecrets)
      }
    },
  },
  mounted () {
    if (this.customDomainEnabled) {
      this.customDomain = true
    }
  },
  methods: {
    ...mapActions(useSecretStore, [
      'dnsSecretsByProviderKind',
    ]),
    getErrorMessages,
  },
}
</script>
