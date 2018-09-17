<!--
Copyright (c) 2018 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file

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
    <v-list-tile>
      <v-list-tile-action>
        <v-icon class="cyan--text text--darken-2">developer_board</v-icon>
      </v-list-tile-action>
      <v-list-tile-content>
        <v-list-tile-sub-title>Grafana</v-list-tile-sub-title>
        <v-list-tile-title><a :href="grafanaUrl" target="_blank" class="cyan--text text--darken-2">{{grafanaUrlText}}</a></v-list-tile-title>
      </v-list-tile-content>
    </v-list-tile>
    <v-list-tile>
      <v-list-tile-action>
      </v-list-tile-action>
      <v-list-tile-content>
        <v-list-tile-sub-title>Prometheus</v-list-tile-sub-title>
        <v-list-tile-title><a :href="prometheusUrl" target="_blank" class="cyan--text text--darken-2">{{prometheusUrl}}</a></v-list-tile-title>
      </v-list-tile-content>
    </v-list-tile>
    <v-list-tile>
      <v-list-tile-action>
      </v-list-tile-action>
      <v-list-tile-content>
        <v-list-tile-sub-title>Alertmanager</v-list-tile-sub-title>
        <v-list-tile-title><a :href="alertmanagerUrl" target="_blank" class="cyan--text text--darken-2">{{alertmanagerUrl}}</a></v-list-tile-title>
      </v-list-tile-content>
    </v-list-tile>
    <v-divider class="my-2" inset></v-divider>
    <username-password :username="username" :password="password"></username-password>
  </v-list>
</template>

<script>
  import UsernamePassword from '@/components/UsernamePasswordListTile'

  export default {
    components: {
      UsernamePassword
    },
    props: {
      info: {
        type: Object,
        required: true
      }
    },
    computed: {
      grafanaUrl () {
        return this.info.grafanaUrl || ''
      },
      grafanaUrlText () {
        return this.info.grafanaUrlText || ''
      },
      prometheusUrl () {
        return this.info.prometheusUrl || ''
      },
      alertmanagerUrl () {
        return this.info.alertmanagerUrl || ''
      },
      username () {
        return this.info.monitoring_username || ''
      },
      password () {
        return this.info.monitoring_password || ''
      }
    }
  }
</script>
