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
      Add-ons
    </v-card-title>
    <div class="list">
      <v-subheader>Add-ons provided by Gardener</v-subheader>
      <v-card-title class="listItem" v-for="item in shootAddonList" :key="item.name">
        <v-layout row class="mb-3">
          <v-flex shrink justify-center class="pr-0">
            <v-icon class="cyan--text text--darken-2 avatar">mdi-puzzle</v-icon>
          </v-flex>
          <v-flex class="pa-0">
            <span class="subheading">{{item.title}}</span><br>
            <span class="grey--text">{{item.description}}</span>
          </v-flex>
          <v-flex shrink class="pa-0">
            <template v-if="componentUrl(item.name)">
              <v-btn icon :href="componentUrl(item.name)" target="_blank">
                <v-icon color="cyan darken-2">mdi-open-in-new</v-icon>
              </v-btn>
            </template>
          </v-flex>
        </v-layout>
      </v-card-title>

      <template v-if="customAddonList.length">
        <v-divider class="my-2" inset></v-divider>
        <v-subheader>Custom add-ons</v-subheader>
        <v-card-title class="listItem" v-for="item in customAddonList" :key="item.name">
          <v-layout row class="mb-3">
            <v-flex shrink justify-center class="pr-0">
              <v-icon class="cyan--text text--darken-2 avatar">mdi-puzzle</v-icon>
            </v-flex>
            <v-flex class="pa-0">
              <span class="subheading">{{item.title}}</span><br>
              <span class="grey--text">{{item.description}}</span>
            </v-flex>
          </v-layout>
        </v-card-title>
      </template>
    </div>
  </v-card>
</template>

<script>

import { mapGetters } from 'vuex'
import get from 'lodash/get'
import filter from 'lodash/filter'
import forEach from 'lodash/forEach'
import find from 'lodash/find'

export default {
  props: {
    shootItem: {
      type: Object
    }
  },
  data () {
    return {
      addonList: [
        {
          name: 'kubernetes-dashboard',
          title: 'Dashboard',
          description: 'General-purpose web UI for Kubernetes clusters'
        },
        {
          name: 'monocular',
          title: 'Monocular',
          description: 'Monocular is a web-based UI for managing Kubernetes applications and services packaged as Helm Charts. It allows you to search and discover available charts from multiple repositories, and install them in your cluster with one click.'
        },
        {
          name: 'nginx-ingress',
          title: 'Nginx Ingress (Deprecated)',
          description: 'This add-on is deprecated and will be removed in the future. You can install it or an alternative ingress controller always manually. If you choose to install it with the cluster, please note that Gardener will include it in its reconciliation and you can’t configure or override it’s configuration.'
        }
      ]
    }
  },
  computed: {
    ...mapGetters([
      'customAddonDefinitionList'
    ]),
    addons () {
      return get(this.shootItem, 'spec.addons', {})
    },
    addon () {
      return (name) => {
        return this.addons[name] || {}
      }
    },
    shootAddonList () {
      return filter(this.addonList, item => this.addon(item.name).enabled)
    },
    componentUrl () {
      return (name) => {
        switch (name) {
          case 'monocular':
            return this.monocularUrl
          default:
            return undefined
        }
      }
    },
    customAddonList () {
      try {
        const customAddonNames = JSON.parse(this.annotations['gardenextensions.sapcloud.io/addons'])
        const list = []
        forEach(customAddonNames, name => {
          const item = find(this.customAddonDefinitionList, ['name', name])
          if (item) {
            list.push(item)
          }
        })
        return list
      } catch (err) {
        return []
      }
    },
    monocularUrl () {
      return `https://monocular.ingress.${this.domain}`
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
