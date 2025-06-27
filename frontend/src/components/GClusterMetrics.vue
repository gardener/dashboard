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

import { useConfigStore } from '@/store/config'

import GUsernamePassword from '@/components/GUsernamePasswordListTile'
import GLinkListTile from '@/components/GLinkListTile'

import { useShootItem } from '@/composables/useShootItem'
import { useShootHelper } from '@/composables/useShootHelper'
import { useShootStatus } from '@/composables/useShootStatus'

import { isTruthyValue } from '@/utils'

import replace from 'lodash/replace'
import get from 'lodash/get'

export default {
  components: {
    GUsernamePassword,
    GLinkListTile,
  },
  setup () {
    const {
      isOidcObservabilityUrlsEnabled,
    } = useConfigStore()

    const {
      shootItem,
      shootInfo,
      isShootStatusHibernated,
    } = useShootItem()

    const {
      seedIngressDomain,
    } = useShootHelper()

    const {
      shootTechnicalId,
    } = useShootStatus(shootItem)

    return {
      shootItem,
      shootInfo,
      isShootStatusHibernated,
      seedIngressDomain,
      shootTechnicalId,
      isOidcObservabilityUrlsEnabled,
    }
  },
  computed: {
    plutonoUrl () {
      if (this.isOidcObservabilityUrlsEnabled) {
        return this.getOidcDeploymentUrl('plutono')
      }

      return `https://gu-${this.prefix}.${this.seedIngressDomain}`
    },
    prometheusUrl () {
      if (this.isOidcObservabilityUrlsEnabled) {
        return this.getOidcStatefulsetUrl('prometheus-shoot')
      }

      return `https://p-${this.prefix}.${this.seedIngressDomain}`
    },
    alertmanagerUrl () {
      if (this.isOidcObservabilityUrlsEnabled) {
        return this.getOidcStatefulsetUrl('alertmanager-shoot')
      }

      return `https://au-${this.prefix}.${this.seedIngressDomain}`
    },
    username () {
      return get(this.shootInfo, ['monitoringUsername'], '')
    },
    password () {
      return get(this.shootInfo, ['monitoringPassword'], '')
    },
    hasAlertmanager () {
      const ignoreAlerts = get(this.shootItem, ['metadata', 'annotations', 'shoot.gardener.cloud/ignore-alerts'], 'false')
      if (isTruthyValue(ignoreAlerts)) {
        return false
      }

      const emailReceivers = get(this.shootItem, ['spec', 'monitoring', 'alerting', 'emailReceivers'], [])
      return emailReceivers.length > 0
    },
    prefix () {
      return replace(this.shootTechnicalId, /^shoot-{1,2}/, '')
    },
  },
  methods: {
    getOidcDeploymentUrl (target) {
      return `https://${target}-${this.shootTechnicalId}.${this.seedIngressDomain}`
    },
    getOidcStatefulsetUrl (target) {
      return `https://${target}-${this.shootTechnicalId}-0.${this.seedIngressDomain}`
    },
  },
}
</script>
