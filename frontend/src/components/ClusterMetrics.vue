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
  <v-list>
    <v-list-tile v-if="isAdmin">
      <v-list-tile-action>
        <v-icon class="cyan--text text--darken-2">developer_board</v-icon>
      </v-list-tile-action>
      <v-list-tile-content>
        <v-list-tile-sub-title>Grafana</v-list-tile-sub-title>
        <v-list-tile-title>
          <v-tooltip v-if="isShootHibernated" top>
            <span slot="activator">{{grafanaUrlOperators}}</span>
            Grafana is not running for hibernated clusters
          </v-tooltip>
          <a v-else :href="grafanaUrlOperators" target="_blank" class="cyan--text text--darken-2">{{grafanaUrlOperators}}</a>
        </v-list-tile-title>
      </v-list-tile-content>
    </v-list-tile>
    <v-list-tile v-else>
      <v-list-tile-action>
        <v-icon class="cyan--text text--darken-2">developer_board</v-icon>
      </v-list-tile-action>
      <v-list-tile-content>
        <v-list-tile-sub-title>Grafana</v-list-tile-sub-title>
        <v-list-tile-title>
          <v-tooltip v-if="isShootHibernated" top>
            <span slot="activator">{{grafanaUrlUsers}}</span>
            Grafana is not running for hibernated clusters
          </v-tooltip>
          <a v-else :href="grafanaUrlUsers" target="_blank" class="cyan--text text--darken-2">{{grafanaUrlUsers}}</a>
        </v-list-tile-title>
      </v-list-tile-content>
    </v-list-tile>
    <v-list-tile v-if="isAdmin">
      <v-list-tile-action>
      </v-list-tile-action>
      <v-list-tile-content>
        <v-list-tile-sub-title>Prometheus</v-list-tile-sub-title>
        <v-list-tile-title>
          <v-tooltip v-if="isShootHibernated" top>
            <span slot="activator">{{prometheusUrl}}</span>
            Prometheus is not running for hibernated clusters
          </v-tooltip>
          <a v-else :href="prometheusUrl" target="_blank" class="cyan--text text--darken-2">{{prometheusUrl}}</a>
        </v-list-tile-title>
      </v-list-tile-content>
    </v-list-tile>
    <v-list-tile v-if="isAdmin">
      <v-list-tile-action>
      </v-list-tile-action>
      <v-list-tile-content>
        <v-list-tile-sub-title>Alertmanager</v-list-tile-sub-title>
        <v-list-tile-title>
          <v-tooltip v-if="isShootHibernated" top>
            <span slot="activator">{{alertmanagerUrl}}</span>
            Alertmanager is not running for hibernated clusters
          </v-tooltip>
          <a v-else :href="alertmanagerUrl" target="_blank" class="cyan--text text--darken-2">{{alertmanagerUrl}}</a>
        </v-list-tile-title>
      </v-list-tile-content>
    </v-list-tile>
    <v-divider v-show="!!username && !!password" class="my-2" inset></v-divider>
    <username-password :username="username" :password="password"></username-password>
  </v-list>
</template>

<script>
import get from 'lodash/get'
import UsernamePassword from '@/components/UsernamePasswordListTile'
import { mapGetters } from 'vuex'
import { shootItem } from '@/mixins/shootItem'

export default {
  components: {
    UsernamePassword
  },
  props: {
    shootItem: {
      type: Object,
      required: true
    }
  },
  mixins: [shootItem],
  computed: {
    ...mapGetters([
      'isAdmin'
    ]),
    grafanaUrlOperators () {
      return get(this.shootItem, 'info.grafanaUrlOperators', '')
    },
    grafanaUrlUsers () {
      return get(this.shootItem, 'info.grafanaUrlUsers', '')
    },
    prometheusUrl () {
      return get(this.shootItem, 'info.prometheusUrl', '')
    },
    alertmanagerUrl () {
      return get(this.shootItem, 'info.alertmanagerUrl', '')
    },
    username () {
      return get(this.shootItem, 'info.monitoring_username', '')
    },
    password () {
      return get(this.shootItem, 'info.monitoring_password', '')
    }
  }
}
</script>
