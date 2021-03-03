<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-list>
    <link-list-tile v-if="isAdmin"
      icon="mdi-developer-board"
      app-title="Grafana"
      :url="grafanaUrlOperators"
      :url-text="grafanaUrlOperators"
      :is-shoot-status-hibernated="isShootStatusHibernated"
    ></link-list-tile>
    <link-list-tile v-else
      icon="mdi-developer-board"
      app-title="Grafana"
      :url="grafanaUrlUsers"
      :url-text="grafanaUrlUsers"
      :is-shoot-status-hibernated="isShootStatusHibernated"
    ></link-list-tile>
    <link-list-tile v-if="isAdmin"
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
    <username-password v-if="isAdmin" :username="username" :password="password" :show-not-available-placeholder="isSeedUnreachable">
      <template v-slot:notAvailablePlaceholder>
        <v-list-item-content>
          <v-list-item-subtitle>Operator Credentials</v-list-item-subtitle>
          <v-list-item-title class="wrap-text pt-1">
            <v-icon color="primary">mdi-alert-circle-outline</v-icon>
            Credentials not available as the Seed {{shootSeedName}} is not reachable by the dashboard
          </v-list-item-title>
        </v-list-item-content>
      </template>
    </username-password>
    <username-password v-else :username="username" :password="password"></username-password>
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
      return this.isAdmin ? get(this.shootItem, 'seedInfo.monitoringUsername', '') : get(this.shootItem, 'info.monitoringUsername', '')
    },
    password () {
      return this.isAdmin ? get(this.shootItem, 'seedInfo.monitoringPassword', '') : get(this.shootItem, 'info.monitoringPassword', '')
    },
    hasAlertmanager () {
      const emailReceivers = get(this.shootItem, 'spec.monitoring.alerting.emailReceivers', [])
      return emailReceivers.length > 0
    }
  }
}
</script>

<style lang="scss" scoped>
  .wrap-text {
    white-space: normal;
  }
</style>
