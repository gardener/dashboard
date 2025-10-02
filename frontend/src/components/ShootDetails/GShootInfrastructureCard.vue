<!--
SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors

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
              :region="shootRegion"
              :zones="shootZones"
            />
          </template>
          <div class="pt-1 d-flex flex-shrink-1">
            <g-vendor
              extended
              :provider-type="shootProviderType"
              :region="shootRegion"
              :zones="shootZones"
            />
          </div>
        </g-list-item-content>
      </g-list-item>
      <g-list-item v-if="hasShootWorkerGroups">
        <g-list-item-content label="Credential">
          <g-binding-name
            :binding="shootCloudProviderBinding"
            render-link
          />
        </g-list-item-content>
      </g-list-item>
      <g-list-item v-if="hasShootWorkerGroups">
        <g-credential-details-item-content
          :credential="credential"
          :shared="isSharedBinding"
          :provider-type="shootCloudProviderBinding.provider.type"
          details-title
        />
      </g-list-item>
      <v-divider inset />
      <template v-if="showSeedInfo">
        <g-list-item>
          <template #prepend>
            <v-icon color="primary">
              mdi-spa
            </v-icon>
          </template>
          <g-list-item-content label="Seed">
            <g-shoot-seed-name />
          </g-list-item-content>
          <template #append>
            <g-copy-btn :clipboard-text="shootSeedName" />
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
            <span class="mr-1">Failure tolerance type</span>
            <g-control-plane-high-availability-tag
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
            v-if="hasShootWorkerGroups"
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
              color="primary"
              variant="tonal"
              class="ml-2"
            >
              {{ customDomainChipText }}
            </v-chip>
          </template>
          <div class="d-flex">
            {{ shootDomain }}
            <g-dns-provider
              v-if="shootDnsPrimaryProvider"
              class="ml-2"
              primary
              :secret-name="shootDnsPrimaryProvider.secretName"
              :shoot-namespace="shootNamespace"
              :type="shootDnsPrimaryProvider.type"
            />
          </div>
        </g-list-item-content>
      </g-list-item>
      <g-list-item v-if="hasDnsServiceExtension || isCustomShootDomain">
        <template #prepend />
        <g-list-item-content label="DNS Providers">
          <div
            v-if="shootDnsServiceExtensionProviders && shootDnsServiceExtensionProviders.length"
            class="d-flex"
          >
            <g-dns-provider
              v-for="({ secretName, type, domains, zones }) in shootDnsServiceExtensionProviders"
              :key="secretName"
              class="mr-2"
              :secret-name="getResourceRefName(secretName)"
              :shoot-namespace="shootNamespace"
              :type="type"
              :domains="domains"
              :zones="zones"
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
      <template v-if="!!shootLoadbalancerClasses">
        <v-divider inset />
        <g-list-item>
          <template #prepend>
            <v-icon color="primary">
              mdi-ip-network-outline
            </v-icon>
          </template>
          <g-list-item-content label="Available Load Balancer Classes">
            <div class="d-flex align-center pt-1">
              <v-chip
                v-for="{ name } in shootLoadbalancerClasses"
                :key="name"
                size="small"
                class="mr-2"
                variant="tonal"
                color="primary"
              >
                {{ name }}
                <v-icon
                  v-if="name === defaultLoadbalancerClass"
                  size="small"
                >
                  mdi-star
                </v-icon>
                <span
                  v-tooltip:top="{
                    text: 'Default Load Balancer Class',
                    disabled: name !== defaultLoadbalancerClass
                  }"
                />
              </v-chip>
            </div>
          </g-list-item-content>
        </g-list-item>
      </template>
    </g-list>
  </v-card>
</template>

<script>
import {
  mapState,
  mapActions,
} from 'pinia'

import { useCloudProfileStore } from '@/store/cloudProfile'
import { useAuthzStore } from '@/store/authz'
import { useGardenerExtensionStore } from '@/store/gardenerExtension'

import GCopyBtn from '@/components/GCopyBtn'
import GShootSeedName from '@/components/GShootSeedName'
import GBindingName from '@/components/Credentials/GBindingName'
import GVendor from '@/components/GVendor'
import GDnsProvider from '@/components/ShootDns/GDnsProvider'
import GDnsConfiguration from '@/components/ShootDns/GDnsConfiguration'
import GSeedConfiguration from '@/components/GSeedConfiguration'
import GControlPlaneHighAvailabilityConfiguration from '@/components/ControlPlaneHighAvailability/GControlPlaneHighAvailabilityConfiguration'
import GControlPlaneHighAvailabilityTag from '@/components/ControlPlaneHighAvailability/GControlPlaneHighAvailabilityTag'
import GCredentialDetailsItemContent from '@/components/Credentials/GCredentialDetailsItemContent'

import { useShootResources } from '@/composables/useShootResources'
import { useShootItem } from '@/composables/useShootItem'
import { useCloudProviderBinding } from '@/composables/credential/useCloudProviderBinding'

import {
  wildcardObjectsFromStrings,
  bestMatchForString,
} from '@/utils/wildcard'

import head from 'lodash/head'
import map from 'lodash/map'
import find from 'lodash/find'
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
    GControlPlaneHighAvailabilityTag,
    GCredentialDetailsItemContent,
  },
  setup () {
    const {
      shootItem,
      shootName,
      shootNamespace,
      shootSeedName,
      shootCloudProfileRef,
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
    } = useShootItem()

    const { getResourceRefName } = useShootResources(shootItem)

    const {
      credential,
      isSharedBinding,
    } = useCloudProviderBinding(shootCloudProviderBinding)

    return {
      shootItem,
      shootName,
      shootNamespace,
      shootSeedName,
      shootCloudProfileRef,
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
      getResourceRefName,
      credential,
      isSharedBinding,
    }
  },
  computed: {
    ...mapState(useGardenerExtensionStore, [
      'hasDnsServiceExtension',
    ]),
    ...mapState(useAuthzStore, [
      'canPatchShootsBinding',
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
    shootLoadbalancerClasses () {
      const shootLBClasses = get(this.shootItem, ['spec', 'provider', 'controlPlaneConfig', 'loadBalancerClasses'])
      if (shootLBClasses) {
        // If the user defines the LB classes in the shoot mainfest, they completely replace the ones defined in the cloudprofile
        return shootLBClasses
      }

      const availableFloatingPools = this.floatingPoolsByCloudProfileRefAndRegionAndDomain({
        cloudProfileRef: this.shootCloudProfileRef,
        region: this.shootRegion,
      })
      const floatingPoolWildCardObjects = wildcardObjectsFromStrings(map(availableFloatingPools, 'name'))

      const shootFloatingPoolName = get(this.shootItem, ['spec', 'provider', 'infrastructureConfig', 'floatingPoolName'])
      const floatingPoolWildcardName = bestMatchForString(floatingPoolWildCardObjects, shootFloatingPoolName)

      if (!floatingPoolWildcardName) {
        return
      }

      const shootFloatingPool = find(availableFloatingPools, ['name', floatingPoolWildcardName.originalValue])
      return get(shootFloatingPool, ['loadBalancerClasses'])
    },
    defaultLoadbalancerClass () {
      const shootLBClasses = this.shootLoadbalancerClasses

      let defaultLoadbalancerClass = find(shootLBClasses, ['purpose', 'default'])
      if (defaultLoadbalancerClass) {
        return defaultLoadbalancerClass.name
      }

      defaultLoadbalancerClass = find(shootLBClasses, ['name', 'default'])
      if (defaultLoadbalancerClass) {
        return defaultLoadbalancerClass.name
      }

      return get(head(shootLBClasses), ['name'])
    },
    customDomainChipText () {
      if (this.isCustomShootDomain) {
        return 'custom'
      }
      return 'generated'
    },
  },
  methods: {
    ...mapActions(useCloudProfileStore, [
      'floatingPoolsByCloudProfileRefAndRegionAndDomain',
    ]),
  },
}
</script>
