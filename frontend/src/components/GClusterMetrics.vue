<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <g-list>
    <g-link-list-tile
      icon="mdi-developer-board"
      app-title="Plutono"
      :url="plutonoUrl"
      :url-text="plutonoUrl"
      :is-shoot-status-hibernated="isShootStatusHibernated"
    />
    <g-link-list-tile
      app-title="Prometheus"
      :url="prometheusUrl"
      :url-text="prometheusUrl"
      :is-shoot-status-hibernated="isShootStatusHibernated"
      content-class="pt-0"
    />
    <g-link-list-tile
      v-if="hasAlertmanager"
      app-title="Alertmanager"
      :url="alertmanagerUrl"
      :url-text="alertmanagerUrl"
      :is-shoot-status-hibernated="isShootStatusHibernated"
      content-class="pt-0"
    />
    <v-divider
      v-show="!!username && !!password"
      inset
    />
    <g-username-password
      :username="username"
      :password="password"
    />
  </g-list>
</template>

<script>
import GUsernamePassword from '@/components/GUsernamePasswordListTile'
import GLinkListTile from '@/components/GLinkListTile'

import { shootItem } from '@/mixins/shootItem'

import { get } from '@/lodash'

export default {
  components: {
    GUsernamePassword,
    GLinkListTile,
  },
  mixins: [shootItem],
  computed: {
    plutonoUrl () {
      return get(this.shootInfo, 'plutonoUrl', '')
    },
    prometheusUrl () {
      return get(this.shootInfo, 'prometheusUrl', '')
    },
    alertmanagerUrl () {
      return get(this.shootInfo, 'alertmanagerUrl', '')
    },
    username () {
      return get(this.shootInfo, 'monitoringUsername', '')
    },
    password () {
      return get(this.shootInfo, 'monitoringPassword', '')
    },
    hasAlertmanager () {
      const emailReceivers = get(this.shootItem, 'spec.monitoring.alerting.emailReceivers', [])
      return emailReceivers.length > 0
    },
  },
}
</script>
