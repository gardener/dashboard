<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-card>
    <v-toolbar flat dense color="toolbar-background toolbar-title--text">
      <v-toolbar-title class="text-subtitle-1">Infrastructure</v-toolbar-title>
    </v-toolbar>
    <v-list>
      <v-list-item>
        <v-list-item-icon>
          <v-icon color="primary">mdi-cloud-outline</v-icon>
        </v-list-item-icon>
        <v-list-item-content>
          <v-list-item-subtitle>
            <vendor title extended :cloud-provider-kind="shootCloudProviderKind" :region="shootRegion" :zones="shootZones"></vendor>
          </v-list-item-subtitle>
          <v-list-item-title class="pt-1 d-flex flex-shrink-1">
            <vendor extended :cloud-provider-kind="shootCloudProviderKind" :region="shootRegion" :zones="shootZones"></vendor>
          </v-list-item-title>
        </v-list-item-content>
      </v-list-item>
      <v-list-item>
        <v-list-item-icon/>
        <v-list-item-content class="pt-0">
          <v-list-item-subtitle>Credential</v-list-item-subtitle>
          <v-list-item-title class="pt-1">
            <router-link v-if="canLinkToSecret"
              :to="{ name: 'Secret', params: { name: shootSecretBindingName, namespace: shootNamespace } }"
            >
              <span class="text-subtitle-1">{{shootSecretBindingName}}</span>
            </router-link>
            <span v-else>{{shootSecretBindingName}}</span>
          </v-list-item-title>
        </v-list-item-content>
      </v-list-item>
      <v-list-item v-if="secret">
        <v-list-item-icon/>
        <secret-details-item-content
          class="pb-2"
          infra
          :secret="secret"
          details-title />
      </v-list-item>
      <v-divider inset></v-divider>
      <template v-if="showSeedInfo">
        <v-list-item>
          <v-list-item-icon>
            <v-icon color="primary">mdi-spa</v-icon>
          </v-list-item-icon>
          <v-list-item-content>
            <v-list-item-subtitle>Seed</v-list-item-subtitle>
            <v-list-item-title class="pt-1">
              <shoot-seed-name :shoot-item="shootItem" />
            </v-list-item-title>
          </v-list-item-content>
          <v-list-item-action class="mx-0">
            <copy-btn :clipboard-text="shootSeedName"></copy-btn>
          </v-list-item-action>
          <v-list-item-action class="mx-0" v-if="canPatchShootsBinding">
            <seed-configuration :shoot-item="shootItem"></seed-configuration>
          </v-list-item-action>
        </v-list-item>
        <v-list-item>
          <v-list-item-icon/>
          <v-list-item-content class="pt-0">
            <v-list-item-subtitle>Technical Id</v-list-item-subtitle>
            <v-list-item-title class="pt-1">
              {{shootTechnicalId}}
            </v-list-item-title>
          </v-list-item-content>
          <v-list-item-action class="mx-0">
            <copy-btn :clipboard-text="shootTechnicalId"></copy-btn>
          </v-list-item-action>
        </v-list-item>
      </template>
      <v-list-item>
        <v-list-item-icon>
          <v-icon v-if="!showSeedInfo" color="primary">mdi-spa</v-icon>
        </v-list-item-icon>
        <v-list-item-content :class="{ 'pt-0': showSeedInfo}">
          <v-list-item-subtitle>Control Plane High Availability</v-list-item-subtitle>
          <v-list-item-title class="pt-1">
            <template v-if="!!shootControlPlaneHighAvailabilityFailureTolerance">
              <span class="mr-1">Failure tolerance type</span>
              <control-plane-high-availability-tag :shoot-item="shootItem" x-small></control-plane-high-availability-tag>
            </template>
            <template v-else>Not configured</template>
          </v-list-item-title>
        </v-list-item-content>
        <v-list-item-action class="mx-0">
          <control-plane-high-availability-configuration :shoot-item="shootItem"></control-plane-high-availability-configuration>
        </v-list-item-action>
      </v-list-item>
      <v-divider inset></v-divider>
      <v-list-item>
        <v-list-item-icon>
          <v-icon color="primary">mdi-ip-network</v-icon>
        </v-list-item-icon>
        <v-list-item-content>
          <v-list-item-subtitle>Pods CIDR</v-list-item-subtitle>
          <v-list-item-title class="pt-1">
            {{podsCidr}}
          </v-list-item-title>
        </v-list-item-content>
      </v-list-item>
      <v-list-item>
        <v-list-item-icon/>
        <v-list-item-content class="pt-0">
          <v-list-item-subtitle>Nodes CIDR</v-list-item-subtitle>
          <v-list-item-title class="pt-1">
            {{nodesCidr}}
          </v-list-item-title>
        </v-list-item-content>
      </v-list-item>
      <v-list-item>
        <v-list-item-icon/>
        <v-list-item-content class="pt-0">
          <v-list-item-subtitle>Services CIDR</v-list-item-subtitle>
          <v-list-item-title class="pt-1">
            {{servicesCidr}}
          </v-list-item-title>
        </v-list-item-content>
      </v-list-item>
      <v-divider inset></v-divider>
      <v-list-item>
        <v-list-item-icon>
          <v-icon color="primary">mdi-dns</v-icon>
        </v-list-item-icon>
        <v-list-item-content>
          <v-list-item-subtitle>
            Shoot Domain
            <v-chip label x-small color="primary" variant="outlined" class="ml-2">{{customDomainChipText}}</v-chip>
          </v-list-item-subtitle>
          <v-list-item-title class="pt-1">
            {{shootDomain}}
          </v-list-item-title>
        </v-list-item-content>
      </v-list-item>
      <v-list-item>
        <v-list-item-icon/>
        <v-list-item-content class="pt-0">
          <v-list-item-subtitle>DNS Providers</v-list-item-subtitle>
          <v-list-item-title class="pt-1">
            <template v-if="shootDnsProviders && shootDnsProviders.length">
                <dns-provider
                  class="mr-2"
                  v-for="({ primary, secretName, type, domains, zones }) in shootDnsProviders"
                  :primary="primary"
                  :secretName="secretName"
                  :shootNamespace="shootNamespace"
                  :type="type"
                  :domains="domains"
                  :zones="zones"
                  :key="secretName"
                  :secret="getCloudProviderSecretByName({ name: secretName, namespace: shootNamespace })">
              </dns-provider>
            </template>
            <span v-else>No DNS provider configured</span>
          </v-list-item-title>
        </v-list-item-content>
        <v-list-item-action>
          <dns-configuration :shootItem="shootItem"></dns-configuration>
        </v-list-item-action>
      </v-list-item>
      <template v-if="!!shootIngressDomainText">
        <v-divider inset></v-divider>
        <v-list-item>
          <v-list-item-icon>
            <v-icon color="primary">mdi-earth</v-icon>
          </v-list-item-icon>
          <v-list-item-content>
            <v-list-item-subtitle>Ingress Domain</v-list-item-subtitle>
            <v-list-item-title class="pt-1">
              {{shootIngressDomainText}}
            </v-list-item-title>
          </v-list-item-content>
        </v-list-item>
      </template>
      <template v-if="!!shootLoadbalancerClasses">
        <v-divider inset></v-divider>
        <v-list-item>
          <v-list-item-icon>
            <v-icon color="primary">mdi-ip-network-outline</v-icon>
          </v-list-item-icon>
          <v-list-item-content>
            <v-list-item-subtitle>Available Load Balancer Classes</v-list-item-subtitle>
            <v-list-item-title class="d-flex align-center pt-1">
              <v-tooltip
                v-for="{ name } in shootLoadbalancerClasses"
                :key="name"
                :disabled="name !== defaultLoadbalancerClass"
                location="top"
              >
                <template v-slot:activator="{ on }">
                  <v-chip
                    v-on="on"
                    small
                    class="mr-2"
                    variant="outlined"
                    color="primary">
                    {{name}}
                    <v-icon v-if="name === defaultLoadbalancerClass" size="small">mdi-star</v-icon>
                  </v-chip>
                </template>
                <span>Default Load Balancer Class</span>
              </v-tooltip>
            </v-list-item-title>
          </v-list-item-content>
        </v-list-item>
      </template>
    </v-list>
  </v-card>
</template>

<script>
import { mapGetters } from 'vuex'
import { wildcardObjectsFromStrings, bestMatchForString } from '@/utils/wildcard'
import get from 'lodash/get'
import find from 'lodash/find'
import map from 'lodash/map'
import head from 'lodash/head'

import CopyBtn from '@/components/CopyBtn.vue'
import ShootSeedName from '@/components/ShootSeedName.vue'
import Vendor from '@/components/Vendor.vue'
import DnsProvider from '@/components/ShootDns/DnsProvider.vue'
import DnsConfiguration from '@/components/ShootDns/DnsConfiguration.vue'
import SeedConfiguration from '@/components/SeedConfiguration.vue'
import ControlPlaneHighAvailabilityConfiguration from '@/components/ControlPlaneHighAvailability/ControlPlaneHighAvailabilityConfiguration.vue'
import ControlPlaneHighAvailabilityTag from '@/components/ControlPlaneHighAvailability/ControlPlaneHighAvailabilityTag.vue'
import SecretDetailsItemContent from '@/components/SecretDetailsItemContent.vue'

import { shootItem } from '@/mixins/shootItem'

export default {
  components: {
    CopyBtn,
    ShootSeedName,
    Vendor,
    DnsProvider,
    DnsConfiguration,
    SeedConfiguration,
    ControlPlaneHighAvailabilityConfiguration,
    ControlPlaneHighAvailabilityTag,
    SecretDetailsItemContent
  },
  mixins: [shootItem],
  computed: {
    ...mapGetters([
      'namespaces',
      'cloudProfileByName',
      'floatingPoolsByCloudProfileNameAndRegionAndDomain',
      'canPatchShootsBinding',
      'infrastructureSecretList',
      'getCloudProviderSecretByName'
    ]),
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
    }
  }
}
</script>
