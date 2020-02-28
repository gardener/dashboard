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
    <link-list-tile v-if="isAdmin" icon="developer_board" appTitle="Grafana" :url="grafanaUrlOperators" :urlText="grafanaUrlOperators" :isShootStatusHibernated="isShootStatusHibernated"></link-list-tile>
    <link-list-tile v-else icon="developer_board" appTitle="Grafana" :url="grafanaUrlUsers" :urlText="grafanaUrlUsers" :isShootStatusHibernated="isShootStatusHibernated"></link-list-tile>
    <link-list-tile v-if="isAdmin" appTitle="Prometheus" :url="prometheusUrl" :urlText="prometheusUrl" :isShootStatusHibernated="isShootStatusHibernated"></link-list-tile>
    <link-list-tile v-if="hasAlertmanager" appTitle="Alertmanager" :url="alertmanagerUrl" :urlText="alertmanagerUrl" :isShootStatusHibernated="isShootStatusHibernated"></link-list-tile>
    <v-divider v-show="!!username && !!password" class="my-2" inset></v-divider>
    <username-password :username="username" :password="password"></username-password>
  </v-list>
</template>

<script>
import get from 'lodash/get'
import UsernamePassword from '@/components/UsernamePasswordListTile'
import LinkListTile from '@/components/LinkListTile'
import { mapGetters } from 'vuex'
import { shootItem } from '@/mixins/shootItem'

export default {
  components: {
    UsernamePassword,
    LinkListTile
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
      return this.isAdmin ? get(this.shootItem, 'seedInfo.monitoring_username', '') : get(this.shootItem, 'info.monitoring_username', '')
    },
    password () {
      return this.isAdmin ? get(this.shootItem, 'seedInfo.monitoring_password', '') : get(this.shootItem, 'info.monitoring_password', '')
    },
    hasAlertmanager () {
      const emailReceivers = get(this.shootItem, 'spec.monitoring.alerting.emailReceivers', [])
      return emailReceivers.length > 0
    }
  }
}
</script>
