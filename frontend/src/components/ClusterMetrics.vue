<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-list>
    <link-list-tile
      icon="mdi-developer-board"
      app-title="Grafana"
      :url="grafanaUrlUsers"
      :url-text="grafanaUrlUsers"
      :is-shoot-status-hibernated="isShootStatusHibernated"
    ></link-list-tile>
    <link-list-tile
      app-title="Prometheus"
      :url="prometheusUrl"
      :url-text="prometheusUrl"
      :is-shoot-status-hibernated="isShootStatusHibernated"
      content-class="pt-0"
    ></link-list-tile>
    <link-list-tile v-if="hasAlertmanager"
      app-title="Alertmanager"
      :url="alertmanagerUrl"
      :url-text="alertmanagerUrl"
      :is-shoot-status-hibernated="isShootStatusHibernated"
      content-class="pt-0"
    ></link-list-tile>
    <v-divider v-show="!!username && !!password" inset></v-divider>
    <username-password :username="username" :password="password"></username-password>
  </v-list>
</template>

<script>
import get from 'lodash/get'
import UsernamePassword from '@/components/UsernamePasswordListTile'
import LinkListTile from '@/components/LinkListTile'
import { shootItem } from '@/mixins/shootItem'

export default {
  components: {
    UsernamePassword,
    LinkListTile
  },
  mixins: [shootItem],
  computed: {
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
      return get(this.shootItem, 'info.monitoringUsername', '')
    },
    password () {
      return get(this.shootItem, 'info.monitoringPassword', '')
    },
    hasAlertmanager () {
      const emailReceivers = get(this.shootItem, 'spec.monitoring.alerting.emailReceivers', [])
      return emailReceivers.length > 0
    }
  }
}
</script>
