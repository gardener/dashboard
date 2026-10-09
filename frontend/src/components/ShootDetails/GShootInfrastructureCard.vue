<!--
SPDX-FileCopyrightText: Contributors to the Gardener project

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-card class="mb-4">
    <g-toolbar title="Infrastructure" />
    <g-list>
      <g-list-item>
        <template #prepend>
          <v-icon color="primary">
            mdi-cloud-outline
          </v-icon>
        </template>
        <g-list-item-content>
          <template #label>
            <g-vendor
              title
              extended
              :provider-type="shootProviderType"
              vendor-type="infra"
              :region="shootRegion"
              :zones="shootZones"
            />
          </template>
          <div class="pt-1 d-flex flex-shrink-1">
            <g-vendor
              extended
              :provider-type="shootProviderType"
              vendor-type="infra"
              :region="shootRegion"
              :zones="shootZones"
            />
          </div>
        </g-list-item-content>
      </g-list-item>
      <g-list-item v-if="shootCloudProviderBinding && hasShootWorkerGroups">
        <g-list-item-content label="Credential">
          <g-binding-name
            :binding="shootCloudProviderBinding"
            render-link
          />
        </g-list-item-content>
        <template #append>
          <g-credential-configuration
            v-if="shootSecretBindingName"
            migration-mode
          />
          <g-credential-configuration
            :disabled="!!shootSecretBindingName"
            :tooltip="!!shootSecretBindingName ? 'Credential migration to a CredentialsBinding is required' : undefined"
          />
        </template>
      </g-list-item>
      <g-list-item v-if="shootCloudProviderBinding && hasShootWorkerGroups">
        <g-credential-details-item-content
          :credential="credential"
          :shared="isSharedBinding"
          :provider-type="shootCloudProviderBinding.provider.type"
          vendor-type="infra"
          details-title
        />
      </g-list-item>
      <v-divider inset />
      <template v-if="showSeedInfo">
        <g-list-item>
          <template #prepend>
            <v-icon color="primary">
              mdi-sprout
            </v-icon>
          </template>
          <g-list-item-content label="Seed">
            <g-shoot-seed-name />
          </g-list-item-content>
          <template #append>
            <g-copy-btn
              v-if="shootSeedName"
              :clipboard-text="shootSeedName"
            />
            <g-seed-configuration
              v-if="canPatchShootsBinding"
            />
          </template>
        </g-list-item>
        <g-list-item>
          <g-list-item-content label="Technical Id">
            {{ shootTechnicalId }}
          </g-list-item-content>
          <template #append>
            <g-copy-btn :clipboard-text="shootTechnicalId" />
          </template>
        </g-list-item>
      </template>
      <g-list-item>
        <template #prepend>
          <v-icon
            v-if="!showSeedInfo"
            color="primary"
          >
            mdi-spa
          </v-icon>
        </template>
        <g-list-item-content label="Control Plane High Availability">
          <div
            v-if="!!shootControlPlaneHighAvailabilityFailureTolerance"
            class="d-flex"
          >
            <span class="mr-1">Failure tolerance</span>
            <g-shoot-control-plane-high-availability-tag
              size="x-small"
            />
          </div>
          <template v-else>
            Not configured
          </template>
        </g-list-item-content>
        <template #append>
          <g-control-plane-high-availability-configuration />
        </template>
      </g-list-item>
      <v-divider inset />
      <template v-if="hasShootWorkerGroups">
        <g-list-item>
          <template #prepend>
            <v-icon color="primary">
              mdi-ip-network
            </v-icon>
          </template>
          <g-list-item-content label="Pods CIDR">
            {{ podsCidr }}
          </g-list-item-content>
        </g-list-item>
        <g-list-item content-class="py-0">
          <g-list-item-content label="Nodes CIDR">
            {{ nodesCidr }}
          </g-list-item-content>
        </g-list-item>
      </template>
      <g-list-item>
        <template #prepend>
          <v-icon
            v-if="!hasShootWorkerGroups"
            color="primary"
          >
            mdi-ip-network
          </v-icon>
        </template>
        <g-list-item-content label="Services CIDR">
          {{ servicesCidr }}
        </g-list-item-content>
      </g-list-item>
      <v-divider inset />
      <g-list-item>
        <template #prepend>
          <v-icon color="primary">
            mdi-dns
          </v-icon>
        </template>
        <g-list-item-content>
          <template #label>
            Shoot Domain
            <v-chip
              label
              size="x-small"
              color="tonal-primary"
              variant="tonal"
              class="ml-2"
            >
              {{ customDomainChipText }}
            </v-chip>
          </template>
          <div class="d-flex">
            {{ shootDomain }}
            <g-dns-provider
              v-if="shootDnsPrimaryProvider?.type && shootDnsPrimaryProviderCredential"
              class="ml-2"
              primary
              :credential="shootDnsPrimaryProviderCredential"
              :type="shootDnsPrimaryProvider.type"
            />
          </div>
        </g-list-item-content>
      </g-list-item>
      <g-list-item v-if="(hasDnsServiceExtension || isCustomShootDomain) && (canPatchShoots || shootDnsServiceExtensionProvidersWithCredentials?.length)">
        <template #prepend />
        <g-list-item-content label="DNS Providers">
          <div
            v-if="shootDnsServiceExtensionProviders && shootDnsServiceExtensionProviders.length"
            class="d-flex"
          >
            <g-dns-provider
              v-for="provider in shootDnsServiceExtensionProvidersWithCredentials"
              :key="dnsExtensionProviderResourceName(provider)"
              class="mr-2"
              :credential="dnsProviderCredential(provider)"
              :type="provider.type"
              :domains="provider.domains"
              :zones="provider.zones"
            />
          </div>
          <span v-else>No DNS provider configured</span>
        </g-list-item-content>
        <template #append>
          <g-dns-configuration />
        </template>
      </g-list-item>
      <template v-if="!!shootIngressDomainText">
        <v-divider inset />
        <g-list-item>
          <template #prepend>
            <v-icon color="primary">
              mdi-earth
            </v-icon>
          </template>
          <g-list-item-content label="Ingress Domain">
            {{ shootIngressDomainText }}
          </g-list-item-content>
        </g-list-item>
      </template>
      <component
        :is="shootInfrastructureCardComponent"
        v-if="shootInfrastructureCardComponent"
      />
    </g-list>
  </v-card>
</template>

<script>
import { mapState } from 'pinia'

import { useAuthzStore } from '@/store/authz'
import { useGardenerExtensionStore } from '@/store/gardenerExtension'
import { useCredentialStore } from '@/store/credential'

import GCopyBtn from '@/components/GCopyBtn'
import GShootSeedName from '@/components/GShootSeedName'
import GBindingName from '@/components/Credentials/GBindingName'
import GVendor from '@/components/GVendor'
import GDnsProvider from '@/components/ShootDns/GDnsProvider'
import GDnsConfiguration from '@/components/ShootDns/GDnsConfiguration'
import GSeedConfiguration from '@/components/GSeedConfiguration'
import GControlPlaneHighAvailabilityConfiguration from '@/components/ControlPlaneHighAvailability/GControlPlaneHighAvailabilityConfiguration'
import GShootControlPlaneHighAvailabilityTag from '@/components/ControlPlaneHighAvailability/GShootControlPlaneHighAvailabilityTag'
import GCredentialDetailsItemContent from '@/components/Credentials/GCredentialDetailsItemContent'
import GCredentialConfiguration from '@/components/Credentials/GShootCredentialConfiguration'

import { useShootResources } from '@/composables/useShootResources'
import { useShootItem } from '@/composables/useShootItem'
import { useCloudProviderBinding } from '@/composables/credential/useCloudProviderBinding'
import {
  getDnsPrimaryProviderCredentialsRef,
  dnsExtensionProviderResourceName,
} from '@/composables/credential/helper'

import { getInfrastructureProviderUi } from '@/providers/infra/ui'

import get from 'lodash/get'

export default {
  components: {
    GCopyBtn,
    GShootSeedName,
    GBindingName,
    GVendor,
    GDnsProvider,
    GDnsConfiguration,
    GSeedConfiguration,
    GControlPlaneHighAvailabilityConfiguration,
    GShootControlPlaneHighAvailabilityTag,
    GCredentialDetailsItemContent,
    GCredentialConfiguration,
  },
  setup () {
    const credentialStore = useCredentialStore()

    const {
      shootItem,
      shootNamespace,
      shootSeedName,
      shootRegion,
      shootZones,
      shootDomain,
      isCustomShootDomain,
      shootCloudProviderBinding,
      hasShootWorkerGroups,
      shootControlPlaneHighAvailabilityFailureTolerance,
      shootProviderType,
      servicesCidr,
      nodesCidr,
      podsCidr,
      shootTechnicalId,
      shootDnsServiceExtensionProviders,
      shootDnsPrimaryProvider,
      shootSecretBindingName,
    } = useShootItem()

    const { getResourceRef } = useShootResources(shootItem)

    const cloudProviderBindingContext = useCloudProviderBinding(shootCloudProviderBinding)
    const {
      credential,
      isSharedBinding,
    } = cloudProviderBindingContext
    return {
      shootItem,
      shootNamespace,
      shootSeedName,
      shootRegion,
      shootZones,
      shootDomain,
      isCustomShootDomain,
      shootCloudProviderBinding,
      hasShootWorkerGroups,
      shootControlPlaneHighAvailabilityFailureTolerance,
      shootProviderType,
      servicesCidr,
      nodesCidr,
      podsCidr,
      shootTechnicalId,
      shootDnsServiceExtensionProviders,
      shootDnsPrimaryProvider,
      getResourceRef,
      dnsExtensionProviderResourceName,
      credential,
      isSharedBinding,
      shootSecretBindingName,
      credentialStore,
    }
  },
  computed: {
    ...mapState(useGardenerExtensionStore, [
      'hasDnsServiceExtension',
    ]),
    ...mapState(useAuthzStore, [
      'canPatchShootsBinding',
      'canPatchShoots',
    ]),
    showSeedInfo () {
      return !!this.shootSeedName
    },
    shootIngressDomainText () {
      const nginxIngressEnabled = get(this.shootItem, ['spec', 'addons', 'nginxIngress', 'enabled'], false)
      if (!this.shootDomain || !nginxIngressEnabled) {
        return undefined
      }
      return `*.ingress.${this.shootDomain}`
    },
    shootInfrastructureCardComponent () {
      return getInfrastructureProviderUi(this.shootProviderType)?.shootInfrastructureCardComponent
    },
    customDomainChipText () {
      if (this.isCustomShootDomain) {
        return 'custom'
      }
      return 'generated'
    },
    shootDnsPrimaryProviderCredential () {
      const credentialsRef = getDnsPrimaryProviderCredentialsRef(this.shootDnsPrimaryProvider)
      return this.getCredentialByRef({
        name: credentialsRef?.name,
        kind: credentialsRef?.kind,
        namespace: this.shootNamespace,
      })
    },
    shootDnsServiceExtensionProvidersWithCredentials () {
      return this.shootDnsServiceExtensionProviders?.filter(provider => !!this.dnsProviderCredential(provider))
    },
  },
  methods: {
    getCredentialByRef ({ name, kind, namespace }) {
      if (!name || !kind || !namespace) {
        return undefined
      }
      if (kind === 'Secret') {
        return this.credentialStore.getSecret({ namespace, name })
      }
      if (kind === 'WorkloadIdentity') {
        return this.credentialStore.getWorkloadIdentity({ namespace, name })
      }
      return undefined
    },
    dnsProviderCredential (provider) {
      const resourceName = dnsExtensionProviderResourceName(provider)
      const resourceRef = this.getResourceRef(resourceName)
      return this.getCredentialByRef({
        name: resourceRef?.name,
        kind: resourceRef?.kind,
        namespace: this.shootNamespace,
      })
    },
  },
}
</script>
