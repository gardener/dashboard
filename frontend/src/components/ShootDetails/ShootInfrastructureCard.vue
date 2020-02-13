<!--
Copyright (c) 2019 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
-->

<template>
  <v-card>
    <v-card-title class="subheading white--text cyan darken-2 cardTitle">
      Infrastructure
    </v-card-title>
    <div class="list">

      <v-card-title class="listItem">
        <v-layout class="py-2">
          <v-flex shrink justify-center class="pr-0 pt-3">
            <v-icon class="cyan--text text--darken-2 avatar">cloud_queue</v-icon>
          </v-flex>
          <v-flex class="pa-0">
            <v-layout row>
              <v-flex>
                <span class="grey--text">Provider</span><br>
                <span class="subheading">{{shootCloudProviderKind}}</span>
              </v-flex>
            </v-layout>
            <v-layout row>
              <v-flex>
                <span class="grey--text">Credential</span><br>
                <router-link v-if="canLinkToSecret" slot="activator" class="cyan--text text--darken-2" :to="{ name: 'Secret', params: { name: shootSecretBindingName, namespace: shootNamespace } }">
                  <span class="subheading">{{shootSecretBindingName}}</span>
                </router-link>
                <span v-else>{{shootSecretBindingName}}</span>
              </v-flex>
            </v-layout>
            <v-layout row>
              <v-flex>
                <span class="grey--text">{{regionZoneTitle}}</span><br>
                <span class="subheading">{{regionZoneText}}</span>
              </v-flex>
            </v-layout>
          </v-flex>
        </v-layout>
      </v-card-title>

      <template v-if="showSeedInfo">
        <v-divider class="my-2" inset></v-divider>
        <v-card-title class="listItem">
          <v-layout class="py-2">
            <v-flex shrink justify-center class="pr-0 pt-3">
              <v-icon class="cyan--text text--darken-2 avatar">spa</v-icon>
            </v-flex>
            <v-flex class="pa-0">
              <v-layout row>
                <v-flex>
                  <span class="grey--text">Seed</span><br>
                  <shoot-seed-name :shootItem="shootItem" />
                </v-flex>
                <copy-btn :clipboard-text="shootSeedName"></copy-btn>
              </v-layout>
              <v-layout row>
                <v-flex>
                  <span class="grey--text">Technical Id</span><br>
                  <span class="subheading">{{shootTechnicalId}}</span>
                </v-flex>
                <copy-btn :clipboard-text="shootTechnicalId"></copy-btn>
              </v-layout>
            </v-flex>
          </v-layout>
        </v-card-title>
      </template>

      <v-divider class="my-2" inset></v-divider>
      <v-card-title class="listItem">
        <v-layout class="py-2">
          <v-flex shrink justify-center class="pr-0 pt-3">
            <v-icon class="cyan--text text--darken-2 avatar">settings_ethernet</v-icon>
          </v-flex>
          <v-flex class="pa-0">
            <v-layout row>
              <v-flex>
                <span class="grey--text">Pods CIDR</span><br>
                <span class="subheading">{{podsCidr}}</span>
              </v-flex>
            </v-layout>
            <v-layout row>
              <v-flex>
                <span class="grey--text">Nodes CIDR</span><br>
                <span class="subheading">{{nodesCidr}}</span>
              </v-flex>
            </v-layout>
            <v-layout row>
              <v-flex>
                <span class="grey--text">Services CIDR</span><br>
                <span class="subheading">{{servicesCidr}}</span>
              </v-flex>
            </v-layout>
          </v-flex>
        </v-layout>
      </v-card-title>

      <template v-if="!!shootIngressDomainText">
        <v-divider class="my-2" inset></v-divider>
        <v-card-title class="listItem">
          <v-icon class="cyan--text text--darken-2 avatar">mdi-earth</v-icon>
          <v-flex class="pa-0">
            <span class="grey--text">Ingress Domain</span><br>
            <span class="subheading">{{shootIngressDomainText}}</span>
          </v-flex>
        </v-card-title>
      </template>

      <template v-if="!!shootLoadbalancerClasses">
        <v-divider class="my-2" inset></v-divider>
        <v-card-title class="listItem">
          <v-icon class="cyan--text text--darken-2 avatar">mdi-ip-network-outline</v-icon>
          <v-flex class="pa-0">
            <span class="grey--text">Available Load Balancer Classes</span><br>
            <lb-class
            v-for="lbClass in shootLoadbalancerClasses"
            :name="lbClass.name"
            :floatingSubnetID="lbClass.floatingSubnetID"
            :key="lbClass.name"
            ></lb-class>
          </v-flex>
        </v-card-title>
      </template>

    </div>
  </v-card>
</template>

<script>

import { mapGetters } from 'vuex'
import get from 'lodash/get'
import join from 'lodash/join'
import includes from 'lodash/includes'
import find from 'lodash/find'
import CopyBtn from '@/components/CopyBtn'
import ShootSeedName from '@/components/ShootSeedName'
import LbClass from '@/components/ShootDetails/LbClass'
import { shootItem } from '@/mixins/shootItem'

export default {
  components: {
    CopyBtn,
    ShootSeedName,
    LbClass
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
    shootZonesText () {
      return join(this.shootZones, ', ')
    },
    regionZoneText () {
      if (this.shootZones.length > 0) {
        return `${this.shootRegion} / ${this.shootZonesText}`
      }
      return this.shootRegion
    },
    regionZoneTitle () {
      if (this.shootZones.length > 0) {
        return `Region / ${this.zoneTitle}`
      }
      return 'Region'
    },
    zoneTitle () {
      if (this.shootZones.length > 1) {
        return 'Zones'
      }
      return 'Zone'
    },
    canLinkToSecret () {
      return this.shootSecretBindingName && this.shootNamespace
    }
  }
}
</script>

<style lang="styl" scoped>

  .cardTitle {
    line-height: 10px;
  }

  .listItem {
    padding-top: 0px;
    padding-bottom: 0px;
  }

  .list {
    padding-top: 8px;
    padding-bottom: 8px;
  }

  .avatar {
    padding-right: 33px;
  }

</style>
