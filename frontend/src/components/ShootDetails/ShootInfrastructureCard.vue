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
          <v-list-item-title class="pt-1">
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
      <template v-if="showSeedInfo">
        <v-divider inset></v-divider>
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
          <v-list-item-action>
            <copy-btn :clipboard-text="shootSeedName"></copy-btn>
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
          <v-list-item-action>
            <copy-btn :clipboard-text="shootTechnicalId"></copy-btn>
          </v-list-item-action>
        </v-list-item>
      </template>
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
          <v-list-item-subtitle>Shoot Domain</v-list-item-subtitle>
          <v-list-item-title class="pt-1">{{shootDomain}}</v-list-item-title>
        </v-list-item-content>
      </v-list-item>
      <v-list-item v-if="shootDnsProviders && shootDnsProviders.length">
        <v-list-item-icon/>
        <v-list-item-content class="pt-0">
          <v-list-item-subtitle>DNS Providers</v-list-item-subtitle>
          <v-list-item-title class="pt-1">
            <dns-provider
              class="mr-2 mb-2"
              v-for="({ primary, secretName, type, domains, zones }, index) in shootDnsProviders"
              :primary="primary"
              :secretName="secretName"
              :type="type"
              :domains="domains"
              :zones="zones"
              :key="index">
            </dns-provider>
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
              <lb-class v-for="{ name, floatingSubnetID } in shootLoadbalancerClasses"
                :name="name"
                :floatingSubnetID="floatingSubnetID"
                :key="name"
              ></lb-class>
            </v-list-item-title>
          </v-list-item-content>
        </v-list-item>
      </template>
    </v-list>
  </v-card>
</template>

<script>
import { mapGetters } from 'vuex'
import get from 'lodash/get'
import includes from 'lodash/includes'
import find from 'lodash/find'

import CopyBtn from '@/components/CopyBtn'
import LbClass from '@/components/ShootDetails/LbClass'
import ShootSeedName from '@/components/ShootSeedName'
import Vendor from '@/components/Vendor'
import DnsProvider from '@/components/ShootDns/DnsProvider'
import DnsConfiguration from '@/components/ShootDns/DnsConfiguration'

import { shootItem } from '@/mixins/shootItem'

export default {
  components: {
    CopyBtn,
    LbClass,
    ShootSeedName,
    Vendor,
    DnsProvider,
    DnsConfiguration
  },
  props: {
    shootItem: {
      type: Object
    }
  },
  mixins: [shootItem],
  computed: {
    ...mapGetters([
      'namespaces',
      'cloudProfileByName'
    ]),
    showSeedInfo () {
      return !!this.shootSeedName && this.hasAccessToGardenNamespace
    },
    hasAccessToGardenNamespace () {
      return includes(this.namespaces, 'garden')
    },
    shootIngressDomainText () {
      const nginxIngressEnabled = get(this.shootItem, 'spec.addons.nginxIngress.enabled', false)
      if (!this.shootDomain || !nginxIngressEnabled) {
        return undefined
      }
      return `*.ingress.${this.shootDomain}`
    },
    shootLoadbalancerClasses () {
      const cloudProfile = this.cloudProfileByName(this.shootCloudProfileName)
      const profileFloatingPools = get(cloudProfile, 'data.providerConfig.constraints.floatingPools')
      const shootFloatingPoolName = get(this.shootItem, 'spec.provider.infrastructureConfig.floatingPoolName')
      const shootFloatingPool = find(profileFloatingPools, { name: shootFloatingPoolName })
      return get(shootFloatingPool, 'loadBalancerClasses')
    },
    canLinkToSecret () {
      return this.shootSecretBindingName && this.shootNamespace
    }
  }
}
</script>
