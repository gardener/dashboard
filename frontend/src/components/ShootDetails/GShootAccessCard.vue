<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <g-list key="accessCardList">
    <g-list-item v-if="!isAnyTileVisible">
      <template #prepend>
        <v-icon
          color="primary"
          icon="mdi-alert-circle-outline"
        />
      </template>
      <g-list-item-content>
        Access information currently not available
      </g-list-item-content>
    </g-list-item>

    <g-terminal-list-tile
      v-if="isTerminalTileVisible"
      :shoot-item="shootItem"
      target="shoot"
      :description="shootTerminalDescription"
      :button-description="shootTerminalButtonDescription"
      :disabled="shootTerminalButtonDisabled"
    />

    <v-divider
      v-if="isTerminalTileVisible && (isTerminalShortcutsTileVisible || isDashboardTileVisible || isCredentialsTileVisible || isKubeconfigTileVisible || isGardenctlTileVisible)"
      inset
    />

    <g-terminal-shortcuts-tile
      v-if="isTerminalShortcutsTileVisible"
      :shoot-item="shootItem"
      popper-boundaries-selector="#accessCardList"
      @add-terminal-shortcut="onAddTerminalShortcut"
    />

    <v-divider
      v-if="isTerminalShortcutsTileVisible && (isDashboardTileVisible || isCredentialsTileVisible || isKubeconfigTileVisible || isGardenctlTileVisible)"
      inset
    />

    <g-link-list-tile
      v-if="isDashboardTileVisible && !hasDashboardTokenAuth"
      icon="mdi-developer-board"
      app-title="Dashboard"
      :url="dashboardUrl"
      :url-text="dashboardUrlText"
      :is-shoot-status-hibernated="isShootStatusHibernated"
    />

    <template v-if="isDashboardTileVisible && hasDashboardTokenAuth">
      <g-list-item>
        <template #prepend>
          <v-icon
            color="primary"
            icon="mdi-developer-board"
          />
        </template>
        <g-list-item-content>
          Dashboard
          <template #description>
            Access Dashboard using the kubectl command-line tool by running the following command:
            <code>kubectl proxy</code>.
            Kubectl will make Dashboard available at:
            <v-tooltip
              v-if="isShootStatusHibernated"
              location="top"
            >
              <template #activator="{ props }">
                <span
                  v-bind="props"
                  class="text-grey"
                >{{ dashboardUrlText }}</span>
              </template>
              Dashboard is not running for hibernated clusters
            </v-tooltip>
            <a
              v-else
              class="text-anchor"
              :href="dashboardUrl"
              target="_blank"
              rel="noopener"
            >
              {{ dashboardUrlText }}
            </a>
          </template>
        </g-list-item-content>
      </g-list-item>
      <g-list-item v-if="token">
        <g-list-item-content label="Token">
          <pre class="scroll">{{ tokenText }}</pre>
        </g-list-item-content>
        <template #append>
          <g-copy-btn :clipboard-text="token" />
          <g-action-button
            :icon="visibilityIcon"
            :tooltip="tokenVisibilityTitle"
            @click="showToken = !showToken"
          />
        </template>
      </g-list-item>
    </template>

    <v-divider
      v-if="isDashboardTileVisible && (isCredentialsTileVisible || isKubeconfigTileVisible || isGardenctlTileVisible)"
      inset
    />

    <g-username-password
      v-if="isCredentialsTileVisible"
      :username="username"
      :password="password"
    />

    <v-divider
      v-if="isCredentialsTileVisible && (isKubeconfigTileVisible || isGardenctlTileVisible)"
      inset
    />

    <template v-if="isKubeconfigTileVisible">
      <g-shoot-kubeconfig
        :shoot-item="shootItem"
        :show-list-icon="true"
        type="gardenlogin"
      />
      <g-shoot-kubeconfig
        :shoot-item="shootItem"
        :show-list-icon="false"
        type="token"
      />
      <g-shoot-kubeconfig
        v-if="hasAdminKubeconfigEnabled"
        :shoot-item="shootItem"
        :show-list-icon="false"
        type="adminkubeconfig"
      />
    </template>

    <v-divider
      v-if="isKubeconfigTileVisible && isGardenctlTileVisible"
      inset
    />

    <g-gardenctl-commands
      v-if="isGardenctlTileVisible"
      :shoot-item="shootItem"
    />
  </g-list>
</template>

<script>
import { mapState } from 'pinia'

import { useAuthnStore } from '@/store/authn'
import { useAuthzStore } from '@/store/authz'
import { useTerminalStore } from '@/store/terminal'
import { useConfigStore } from '@/store/config'

import GList from '@/components/GList.vue'
import GListItem from '@/components/GListItem.vue'
import GListItemContent from '@/components/GListItemContent.vue'
import GActionButton from '@/components/GActionButton.vue'
import GCopyBtn from '@/components/GCopyBtn.vue'
import GUsernamePassword from '@/components/GUsernamePasswordListTile.vue'
import GTerminalListTile from '@/components/GTerminalListTile.vue'
import GLinkListTile from '@/components/GLinkListTile.vue'

import { shootItem } from '@/mixins/shootItem'

import GGardenctlCommands from './GGardenctlCommands.vue'
import GShootKubeconfig from './GShootKubeconfig.vue'
import GTerminalShortcutsTile from './GTerminalShortcutsTile.vue'

import {
  get,
  isEmpty,
} from '@/lodash'

export default {
  components: {
    GList,
    GListItem,
    GListItemContent,
    GActionButton,
    GUsernamePassword,
    GCopyBtn,
    GTerminalListTile,
    GLinkListTile,
    GShootKubeconfig,
    GGardenctlCommands,
    GTerminalShortcutsTile,
  },
  mixins: [shootItem],
  props: {
    hideTerminalShortcuts: {
      type: Boolean,
      default: false,
    },
  },
  emits: [
    'addTerminalShortcut',
  ],
  data () {
    return {
      showToken: false,
    }
  },
  computed: {
    ...mapState(useAuthnStore, [
      'isAdmin',
    ]),
    ...mapState(useAuthzStore, [
      'hasShootTerminalAccess',
      'canCreateShootsAdminkubeconfig',
      'hasControlPlaneTerminalAccess',
      'canPatchShoots',
    ]),
    ...mapState(useTerminalStore, [
      'isTerminalShortcutsFeatureEnabled',
    ]),
    ...mapState(useConfigStore, ['shootAdminKubeconfig']),
    dashboardUrl () {
      if (!this.hasDashboardEnabled) {
        return ''
      }
      if (!this.hasDashboardTokenAuth) {
        return this.shootInfo.dashboardUrl || ''
      }

      if (!this.shootInfo.dashboardUrlPath) {
        return ''
      }
      const pathname = this.shootInfo.dashboardUrlPath
      return `http://localhost:8001${pathname}`
    },
    dashboardUrlText () {
      if (this.hasDashboardTokenAuth) {
        return this.dashboardUrl
      }
      return this.shootInfo.dashboardUrlText || ''
    },
    username () {
      return this.shootInfo.cluster_username || ''
    },
    password () {
      return this.shootInfo.cluster_password || ''
    },
    hasDashboardEnabled () {
      return get(this.shootItem, 'spec.addons.kubernetesDashboard.enabled', false) === true
    },
    hasDashboardTokenAuth () {
      return get(this.shootItem, 'spec.addons.kubernetesDashboard.authenticationMode', 'basic') === 'token'
    },
    hasAdminKubeconfigEnabled () {
      return this.shootAdminKubeconfig?.enabled
    },
    kubeconfig () {
      return get(this.shootInfo, 'kubeconfig')
    },
    kubeconfigGardenlogin () {
      return this.shootInfo?.kubeconfigGardenlogin
    },
    shootTerminalButtonDisabled () {
      return !this.isAdmin && this.isShootStatusHibernated
    },
    shootTerminalButtonDescription () {
      if (this.shootTerminalButtonDisabled) {
        return 'Cluster is hibernated. Wake up cluster to open terminal.'
      }
      return this.shootTerminalDescription
    },
    shootTerminalDescription () {
      return this.hasControlPlaneTerminalAccess ? 'Open terminal into cluster or cluster\'s control plane' : 'Open terminal into cluster'
    },
    isAnyTileVisible () {
      return this.isDashboardTileVisible || this.isCredentialsTileVisible || this.isKubeconfigTileVisible || this.isTerminalTileVisible
    },
    isDashboardTileVisible () {
      return !!this.dashboardUrl
    },
    isCredentialsTileVisible () {
      return !!this.username && !!this.password
    },
    isKubeconfigTileVisible () {
      return !!this.kubeconfigGardenlogin || this.canPatchShoots
    },
    isGardenctlTileVisible () {
      return this.canCreateShootsAdminkubeconfig
    },
    isTerminalTileVisible () {
      return !isEmpty(this.shootItem) && this.hasShootTerminalAccess && !this.isSeedUnreachable && (this.hasShootWorkerGroups || this.isAdmin)
    },
    isTerminalShortcutsTileVisible () {
      return !isEmpty(this.shootItem) && this.isTerminalShortcutsFeatureEnabled && this.hasShootTerminalAccess && !this.hideTerminalShortcuts && !this.isSeedUnreachable && (this.hasShootWorkerGroups || this.isAdmin)
    },
    token () {
      return this.shootInfo.cluster_token || ''
    },
    tokenText () {
      return this.showToken ? this.token : '****************'
    },
    tokenVisibilityTitle () {
      return this.showToken ? 'Hide token' : 'Show token'
    },
    visibilityIcon () {
      return this.showToken ? 'mdi-eye-off' : 'mdi-eye'
    },
  },
  methods: {
    onAddTerminalShortcut (shortcut) {
      this.$emit('addTerminalShortcut', shortcut)
    },
  },
}
</script>

<style lang="scss" scoped>
  .scroll {
    overflow-x: auto;
  }

  .wrap-text {
    line-height: inherit;
    overflow: auto !important;
    white-space: normal !important;
    code {
      box-shadow: none !important;
      padding: 1px;
      color: black;
    }
  }
</style>
