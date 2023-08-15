<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

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
              :cloud-provider-kind="shootCloudProviderKind"
              :region="shootRegion"
              :zones="shootZones"
            />
          </template>
          <div class="pt-1 d-flex flex-shrink-1">
            <g-vendor
              extended
              :cloud-provider-kind="shootCloudProviderKind"
              :region="shootRegion"
              :zones="shootZones"
            />
          </div>
        </g-list-item-content>
      </g-list-item>
      <g-list-item>
        <g-list-item-content label="Credential">
          <router-link
            v-if="canLinkToSecret"
            class="text-anchor"
            :to="{ name: 'Secret', params: { name: shootSecretBindingName, namespace: shootNamespace } }"
          >
            <span class="text-subtitle-1">{{ shootSecretBindingName }}</span>
          </router-link>
          <span v-else>{{ shootSecretBindingName }}</span>
        </g-list-item-content>
      </g-list-item>
      <g-list-item v-if="secret">
        <g-secret-details-item-content
          infra
          :secret="secret"
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
            <g-shoot-seed-name :shoot-item="shootItem" />
          </g-list-item-content>
          <template #append>
            <g-copy-btn :clipboard-text="shootSeedName" />
            <g-seed-configuration
              v-if="canPatchShootsBinding"
              :shoot-item="shootItem"
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
              :shoot-item="shootItem"
              size="x-small"
            />
          </div>
          <template v-else>
            Not configured
          </template>
        </g-list-item-content>
        <template #append>
          <g-control-plane-high-availability-configuration :shoot-item="shootItem" />
        </template>
      </g-list-item>
      <v-divider inset />
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
      <g-list-item>
        <template #prepend />
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
              variant="outlined"
              class="ml-2"
            >
              {{ customDomainChipText }}
            </v-chip>
          </template>
          {{ shootDomain }}
        </g-list-item-content>
      </g-list-item>
      <g-list-item>
        <template #prepend />
        <g-list-item-content label="DNS Providers">
          <template v-if="shootDnsProviders && shootDnsProviders.length">
            <g-dns-provider
              v-for="({ primary, secretName, type, domains, zones }) in shootDnsProviders"
              :key="secretName"
              class="mr-2"
              :primary="primary"
              :secret-name="secretName"
              :shoot-namespace="shootNamespace"
              :type="type"
              :domains="domains"
              :zones="zones"
              :secret="getCloudProviderSecretByName({ name: secretName, namespace: shootNamespace })"
            />
          </template>
          <span v-else>No DNS provider configured</span>
        </g-list-item-content>
        <template #append>
          <g-dns-configuration :shoot-item="shootItem" />
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
              <v-tooltip
                v-for="{ name } in shootLoadbalancerClasses"
                :key="name"
                :disabled="name !== defaultLoadbalancerClass"
                location="top"
              >
                <template #activator="{ props }">
                  <v-chip
                    v-bind="props"
                    size="small"
                    class="mr-2"
                    variant="outlined"
                    color="primary"
                  >
                    {{ name }}
                    <v-icon
                      v-if="name === defaultLoadbalancerClass"
                      size="small"
                    >
                      mdi-star
                    </v-icon>
                  </v-chip>
                </template>
                <span>Default Load Balancer Class</span>
              </v-tooltip>
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
import { useSecretStore } from '@/store/secret'
import { useAuthzStore } from '@/store/authz'

import GCopyBtn from '@/components/GCopyBtn'
import GShootSeedName from '@/components/GShootSeedName'
import GVendor from '@/components/GVendor'
import GDnsProvider from '@/components/ShootDns/GDnsProvider'
import GDnsConfiguration from '@/components/ShootDns/GDnsConfiguration'
import GSeedConfiguration from '@/components/GSeedConfiguration'
import GControlPlaneHighAvailabilityConfiguration from '@/components/ControlPlaneHighAvailability/GControlPlaneHighAvailabilityConfiguration'
import GControlPlaneHighAvailabilityTag from '@/components/ControlPlaneHighAvailability/GControlPlaneHighAvailabilityTag'
import GSecretDetailsItemContent from '@/components/Secrets/GSecretDetailsItemContent'

import {
  wildcardObjectsFromStrings,
  bestMatchForString,
} from '@/utils/wildcard'
import { shootItem } from '@/mixins/shootItem'

import {
  get,
  find,
  map,
  head,
} from '@/lodash'

export default {
  components: {
    GCopyBtn,
    GShootSeedName,
    GVendor,
    GDnsProvider,
    GDnsConfiguration,
    GSeedConfiguration,
    GControlPlaneHighAvailabilityConfiguration,
    GControlPlaneHighAvailabilityTag,
    GSecretDetailsItemContent,
  },
  mixins: [shootItem],
  computed: {
    ...mapState(useAuthzStore, ['canPatchShootsBinding']),
    ...mapState(useSecretStore, ['infrastructureSecretList']),
    showSeedInfo () {
      return !!this.shootSeedName
    },
    shootIngressDomainText () {
      const nginxIngressEnabled = get(this.shootItem, 'spec.addons.nginxIngress.enabled', false)
      if (!this.shootDomain || !nginxIngressEnabled) {
        return undefined
      }
      return `*.ingress.${this.shootDomain}`
    },
    shootLoadbalancerClasses () {
      const shootLBClasses = get(this.shootItem, 'spec.provider.controlPlaneConfig.loadBalancerClasses')
      if (shootLBClasses) {
        // If the user defines the LB classes in the shoot mainfest, they completely replace the ones defined in the cloudprofile
        return shootLBClasses
      }

      const availableFloatingPools = this.floatingPoolsByCloudProfileNameAndRegionAndDomain({ cloudProfileName: this.shootCloudProfileName, region: this.shootRegion })
      const floatingPoolWildCardObjects = wildcardObjectsFromStrings(map(availableFloatingPools, 'name'))

      const shootFloatingPoolName = get(this.shootItem, 'spec.provider.infrastructureConfig.floatingPoolName')
      const floatingPoolWildcardName = bestMatchForString(floatingPoolWildCardObjects, shootFloatingPoolName)

      if (!floatingPoolWildcardName) {
        return
      }

      const shootFloatingPool = find(availableFloatingPools, ['name', floatingPoolWildcardName.originalValue])
      return get(shootFloatingPool, 'loadBalancerClasses')
    },
    defaultLoadbalancerClass () {
      const shootLBClasses = this.shootLoadbalancerClasses

      let defaultLoadbalancerClass = find(shootLBClasses, { purpose: 'default' })
      if (defaultLoadbalancerClass) {
        return defaultLoadbalancerClass.name
      }

      defaultLoadbalancerClass = find(shootLBClasses, { name: 'default' })
      if (defaultLoadbalancerClass) {
        return defaultLoadbalancerClass.name
      }

      return get(head(shootLBClasses), 'name')
    },
    canLinkToSecret () {
      return this.shootSecretBindingName && this.shootNamespace
    },
    customDomainChipText () {
      if (this.isCustomShootDomain) {
        return 'custom'
      }
      return 'generated'
    },
    secret () {
      const secrets = this.infrastructureSecretList
      const secret = find(secrets, ['metadata.name', this.shootSecretBindingName])
      return secret
    },
  },
  methods: {
    ...mapActions(useCloudProfileStore, [
      'cloudProfileByName',
      'floatingPoolsByCloudProfileNameAndRegionAndDomain',
    ]),
    ...mapActions(useSecretStore, ['getCloudProviderSecretByName']),
  },
}
</script>
@/lodash
