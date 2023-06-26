<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-list>
    <g-link-list-tile
      icon="mdi-developer-board"
      app-title="Grafana"
      :url="grafanaUrl"
      :url-text="grafanaUrl"
      :is-shoot-status-hibernated="isShootStatusHibernated"
    ></g-link-list-tile>
    <g-link-list-tile
      app-title="Prometheus"
      :url="prometheusUrl"
      :url-text="prometheusUrl"
      :is-shoot-status-hibernated="isShootStatusHibernated"
      content-class="pt-0"
    ></g-link-list-tile>
    <g-link-list-tile v-if="hasAlertmanager"
      app-title="Alertmanager"
      :url="alertmanagerUrl"
      :url-text="alertmanagerUrl"
      :is-shoot-status-hibernated="isShootStatusHibernated"
      content-class="pt-0"
    ></g-link-list-tile>
    <v-divider v-show="!!username && !!password" inset></v-divider>
    <g-username-password :username="username" :password="password"></g-username-password>
  </v-list>
</template>

<script>
import get from 'lodash/get'
import GUsernamePassword from '@/components/GUsernamePasswordListTile'
import GLinkListTile from '@/components/GLinkListTile'
import { shootItem } from '@/mixins/shootItem'

export default {
  components: {
    GUsernamePassword,
    GLinkListTile,
  },
  mixins: [shootItem],
  computed: {
    grafanaUrl () {
      return get(this.shootItem, 'info.grafanaUrl', '')
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
    },
  },
}
</script>
