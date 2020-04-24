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
    <v-toolbar flat dark dense color="cyan darken-2">
      <v-toolbar-title class="subtitle-1">Infrastructure</v-toolbar-title>
    </v-toolbar>
    <v-list>
      <v-list-item>
        <v-list-item-icon>
          <v-icon color="cyan darken-2">cloud_queue</v-icon>
        </v-list-item-icon>
        <v-list-item-content>
          <v-list-item-subtitle>
            <vendor title extended :shootItem="shootItem"></vendor>
          </v-list-item-subtitle>
          <v-list-item-title class="pt-1">
            <vendor extended :shootItem="shootItem"></vendor>
          </v-list-item-title>
        </v-list-item-content>
      </v-list-item>
      <v-list-item>
        <v-list-item-icon/>
        <v-list-item-content class="pt-0">
          <v-list-item-subtitle>Credential</v-list-item-subtitle>
          <v-list-item-title class="pt-1">
            <router-link v-if="canLinkToSecret"
              class="cyan--text text--darken-2"
              :to="{ name: 'Secret', params: { name: shootSecretBindingName, namespace: shootNamespace } }"
            >
              <span class="subtitle-1">{{shootSecretBindingName}}</span>
            </router-link>
            <span v-else>{{shootSecretBindingName}}</span>
          </v-list-item-title>
        </v-list-item-content>
      </v-list-item>
      <template v-if="showSeedInfo">
        <v-divider inset></v-divider>
        <v-list-item>
          <v-list-item-icon>
            <v-icon color="cyan darken-2">spa</v-icon>
          </v-list-item-icon>
          <v-list-item-content>
            <v-list-item-subtitle>Seed</v-list-item-subtitle>
            <v-list-item-title class="pt-1">
              <shoot-seed-name :shootItem="shootItem" />
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
          <v-icon color="cyan darken-2">settings_ethernet</v-icon>
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
      <template v-if="!!shootIngressDomainText">
        <v-divider inset></v-divider>
        <v-list-item>
          <v-list-item-icon>
            <v-icon color="cyan darken-2">mdi-earth</v-icon>
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
            <v-icon color="cyan darken-2">mdi-ip-network-outline</v-icon>
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
import ShootSeedName from '@/components/ShootSeedName'
import Vendor from '@/components/Vendor'
import LbClass from '@/components/ShootDetails/LbClass'
import { shootItem } from '@/mixins/shootItem'

export default {
  components: {
    CopyBtn,
    ShootSeedName,
    LbClass,
    Vendor
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
