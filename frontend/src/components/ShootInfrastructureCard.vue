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
        <v-icon class="cyan--text text--darken-2 avatar">cloud_queue</v-icon>
        <v-flex class="pa-0">
          <span class="grey--text">Provider</span><br>
          <v-tooltip top open-delay="500">
            <span slot="activator" class="subheading">{{getCloudProviderKind}}</span>
            <span>Provider</span>
          </v-tooltip>
          /
          <v-tooltip top open-delay="500">
            <span slot="activator" class="subheading">{{region}}</span>
            <span>Region</span>
          </v-tooltip>
          <template v-if="!!secret">
            /
            <v-tooltip top open-delay="500">
              <router-link slot="activator" class="cyan--text text--darken-2" :to="{ name: 'Secret', params: { name: secret, namespace } }">
                <span class="subheading">{{secret}}</span>
              </router-link>
              <span>Used Credential</span>
            </v-tooltip>
          </template>
        </v-flex>
      </v-card-title>

      <template v-if="showSeedInfo">
        <v-divider class="my-2" inset></v-divider>
        <v-card-title class="listItem">
          <v-layout>
            <v-flex shrink justify-center class="pr-0 pt-3">
              <v-icon class="cyan--text text--darken-2 avatar">spa</v-icon>
            </v-flex>
            <v-flex class="pa-0">
              <span class="grey--text">Seed</span><br>
              <router-link v-if="canLinkToSeed" class="cyan--text text--darken-2 subheading" :to="{ name: 'ShootItem', params: { name: seed, namespace:'garden' } }">
                <span class="subheading">{{seed}}</span><br>
              </router-link>
              <template v-else>
                <span class="subheading">{{seed}}</span><br>
              </template>
              <v-layout row>
                <v-flex>
                  <span class="grey--text">Technical Id</span><br>
                  <span class="subheading">{{technicalId}}</span>
                </v-flex>
                <copy-btn :clipboard-text="technicalId"></copy-btn>
              </v-layout>
            </v-flex>
          </v-layout>
        </v-card-title>
      </template>

      <v-divider class="my-2" inset></v-divider>
      <v-card-title class="listItem">
        <v-icon class="cyan--text text--darken-2 avatar">settings_ethernet</v-icon>
        <v-flex class="pa-0">
          <span class="grey--text">CIDR</span><br>
          <span class="subheading">{{cidr}}</span>
        </v-flex>
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

    </div>
  </v-card>
</template>

<script>

import { mapGetters } from 'vuex'
import get from 'lodash/get'
import includes from 'lodash/includes'
import CopyBtn from '@/components/CopyBtn'
import {
  getCloudProviderKind,
  canLinkToSeed
} from '@/utils'

export default {
  components: {
    CopyBtn
  },
  props: {
    shootItem: {
      type: Object
    }
  },
  computed: {
    ...mapGetters([
      'namespaces'
    ]),
    getCloudProviderKind () {
      return getCloudProviderKind(get(this.shootItem, 'spec.cloud'))
    },
    region () {
      return get(this.shootItem, 'spec.cloud.region')
    },
    secret () {
      return get(this.shootItem, 'spec.cloud.secretBindingRef.name')
    },
    cidr () {
      return get(this.shootItem, `spec.cloud.${this.getCloudProviderKind}.networks.nodes`)
    },
    technicalId () {
      return get(this.shootItem, `status.technicalID`)
    },
    seed () {
      return get(this.shootItem, 'spec.cloud.seed')
    },
    showSeedInfo () {
      return !!this.seed && this.hasAccessToGardenNamespace
    },
    hasAccessToGardenNamespace () {
      return includes(this.namespaces, 'garden')
    },
    canLinkToSeed () {
      return canLinkToSeed({ shootNamespace: this.namespace })
    },
    shootIngressDomainText () {
      const nginxIngressEnabled = get(this.shootItem, 'spec.addons.nginx-ingress.enabled', false)
      if (!this.domain || !nginxIngressEnabled) {
        return undefined
      }
      return `*.ingress.${this.domain}`
    },
    namespace () {
      return get(this.$route.params, 'namespace')
    },
    domain () {
      return get(this.shootItem, 'spec.dns.domain')
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
