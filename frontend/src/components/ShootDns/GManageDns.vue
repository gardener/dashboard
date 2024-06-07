<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-container class="px-0 mx-0">
    <v-row>
      <v-checkbox
        v-model="customDomainEnabled"
        label="Custom Cluster Domain"
        color="primary"
        :disabled="!isNewCluster"
        density="compact"
        :hint="domainCheckboxHint"
        :hide-details="isNewCluster"
        :persistent-hint="!isNewCluster"
        class="mb-3 mx-3"
      />
    </v-row>
    <template v-if="customDomainEnabled">
      <v-row>
        <v-col cols="6">
          <v-text-field
            v-model="dnsDomain"
            color="primary"
            label="Cluster Domain"
            :disabled="!isNewCluster"
            :persistent-hint="!isNewCluster"
            :hint="domainHint"
            variant="underlined"
          />
        </v-col>
        <template v-if="primaryProviderVisible">
          <v-col cols="3">
            <v-select
              v-model="v$.primaryDnsProviderType.$model"
              color="primary"
              :items="dnsProviderTypesWithPrimarySupport"
              :error-messages="getErrorMessages(v$.primaryDnsProviderType)"
              label="DNS Provider Type"
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
              :dns-provider-kind="primaryDnsProviderType"
              register-vuelidate-as="dnsProviderSecret"
            />
          </v-col>
        </template>
      </v-row>
      <v-row v-if="showCustomDomainRecommendation">
        <v-col>
          <v-alert
            variant="tonal"
            type="info"
          >
            <div>
              The primary DNS provider is used for Gardener internal purposes only.
              The DNS providers for the shoot-dns-service extension are configured separately.
              Click the button to apply the recommended configuration for the shoot-dns-service.
              This will add an additional provider with your custom domain as <code>include</code> domain.
            </div>
            <div>
              <v-btn
                size="x-small"
                variant="tonal"
                @click="addExtensionCustomDomainProvider"
              >
                Apply Recommended DNS Configuration
              </v-btn>
            </div>
          </v-alert>
        </v-col>
      </v-row>
    </template>
    <template v-if="isDnsServiceExtensionDeployed">
      <v-divider class="my-3" />
      <div class="wrap-text text-subtitle-2">
        Additional DNS Providers for the <code>shoot-dns-service</code> Extension
      </div>
      <div class="alternate-row-background">
        <v-expand-transition group>
          <v-row
            v-for="id in extensionDnsProviderIds"
            :key="id"
            class="list-item pt-2"
          >
            <g-dns-provider-row :dns-provider-id="id" />
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
              @click="addExtensionDnsProvider()"
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
  nilUnless,
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
      dnsPrimaryProvider,
      isNewCluster,
      dnsProvidersWithPrimarySupport,
      extensionDnsProviderIds,
      hasExtensionCustomDomainProvider,
      addExtensionDnsProvider,
      addExtensionCustomDomainProvider,
    } = useShootContext()

    return {
      v$: useVuelidate(),
      dnsDomain,
      dnsPrimaryProvider,
      isNewCluster,
      dnsProvidersWithPrimarySupport,
      extensionDnsProviderIds,
      hasExtensionCustomDomainProvider,
      addExtensionDnsProvider,
      addExtensionCustomDomainProvider,
    }
  },
  validations () {
    return {
      primaryDnsProviderType: withFieldName('Primary DNS Provider Type', {
        required: withMessage('Provider type is required if a custom domain is defined', requiredIf(this.isNewCluster && !!this.dnsDomain)),
        nil: withMessage('Provider type is not allowed if no custom domain is defined', nilUnless('dnsDomain')),
      }),
      primaryDnsProviderSecret: withFieldName('Primary DNS Provider Secret', {
        required: withMessage('Provider secret is required if a custom domain is defined', requiredIf(this.isNewCluster && !!this.dnsDomain)),
        nil: withMessage('Provider secret is not allowed if no custom domain is defined', nilUnless('dnsDomain')),
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
      'isDnsServiceExtensionDeployed',
    ]),
    domainHint () {
      return this.isNewCluster
        ? 'External available domain of the cluster'
        : 'Domain cannot be changed after cluster creation'
    },
    domainCheckboxHint () {
      const enabledOrDisabled = this.customDomainEnabled ? 'disabled' : 'enabled'
      return this.isNewCluster
        ? ''
        : `Custom domain cannot be ${enabledOrDisabled} after cluster creation`
    },
    typeHint () {
      return this.isNewCluster
        ? ''
        : 'Primary DNS Provider Type cannot be changed after cluster creation'
    },
    primaryProviderVisible () {
      return !!this.primaryDnsProviderType || (this.isNewCluster && !!this.dnsDomain)
    },
    customDomainEnabled: {
      get () {
        return this.customDomain ||
          (!!this.dnsDomain && !!this.primaryDnsProviderType)
      },
      set (value) {
        if (!value) {
          this.dnsDomain = undefined
        }
        this.customDomain = value
      },
    },
    primaryDnsProviderType: {
      get () {
        return this.dnsPrimaryProvider.type
      },
      set (value) {
        this.dnsPrimaryProvider.type = value
      },
    },
    primaryDnsProviderSecret: {
      get () {
        const dnsSecrets = this.dnsSecretsByProviderKind(this.primaryDnsProviderType)
        return find(dnsSecrets, ['metadata.secretRef.name', this.dnsPrimaryProvider.secretName])
      },
      set (value) {
        this.dnsPrimaryProvider.secretName = value?.metadata.secretRef.name
      },
    },
    showCustomDomainRecommendation () {
      if (!this.primaryDnsProviderType) {
        return false
      }
      if (!this.primaryDnsProviderSecret) {
        return false
      }
      if (!this.isDnsServiceExtensionDeployed) {
        return false
      }
      return !this.hasExtensionCustomDomainProvider
    },
  },
  watch: {
    primaryProviderVisible (value) {
      if (value) {
        const type = head(this.dnsProviderTypesWithPrimarySupport)
        this.primaryDnsProviderType = type
        const dnsSecrets = this.dnsSecretsByProviderKind(type)
        this.primaryDnsProviderSecret = head(dnsSecrets)
      }
    },
  },
  mounted () {
    this.v$.$touch()
  },
  methods: {
    ...mapActions(useSecretStore, [
      'dnsSecretsByProviderKind',
    ]),
    getErrorMessages,
  },
}
</script>
