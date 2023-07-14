<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <g-list key="accessCardList">
    <g-list-item v-if="!isAnyTileVisible">
      <template v-slot:prepend>
        <v-icon color="primary" icon="mdi-alert-circle-outline"/>
      </template>
      <g-list-item-content>
        Access information currently not available
      </g-list-item-content>
    </g-list-item>

    <g-terminal-list-tile v-if="isTerminalTileVisible"
      :shoot-item=shootItem
      target="shoot"
      :description="shootTerminalDescription"
      :button-description="shootTerminalButtonDescription"
      :disabled="shootTerminalButtonDisabled"
    />

    <v-divider v-if="isTerminalTileVisible && (isTerminalShortcutsTileVisible || isDashboardTileVisible || isCredentialsTileVisible || isKubeconfigTileVisible || isGardenctlTileVisible)" inset></v-divider>

    <g-terminal-shortcuts-tile v-if="isTerminalShortcutsTileVisible"
      :shoot-item="shootItem"
      popper-boundaries-selector="#accessCardList"
      @add-terminal-shortcut="onAddTerminalShortcut"
    />

    <v-divider v-if="isTerminalShortcutsTileVisible && (isDashboardTileVisible || isCredentialsTileVisible || isKubeconfigTileVisible || isGardenctlTileVisible)" inset></v-divider>

    <g-link-list-tile v-if="isDashboardTileVisible && !hasDashboardTokenAuth"
      icon="mdi-developer-board"
      app-title="Dashboard"
      :url="dashboardUrl"
      :url-text="dashboardUrlText"
      :is-shoot-status-hibernated="isShootStatusHibernated"
    />

    <template v-if="isDashboardTileVisible && hasDashboardTokenAuth">
      <g-list-item>
        <template v-slot:prepend>
          <v-icon color="primary" icon="mdi-developer-board"/>
        </template>
        <g-list-item-content>
          <template v-slot:label>
            Dashboard
            <div class="text-caption wrap-text py-2">
              Access Dashboard using the kubectl command-line tool by running the following command:
              <code>kubectl proxy</code>.
              Kubectl will make Dashboard available at:
            </div>
          </template>
          <v-tooltip v-if="isShootStatusHibernated"
            location="top"
          >
            <template v-slot:activator="{ props }">
              <span v-bind="props" class="text-grey">{{dashboardUrlText}}</span>
            </template>
            Dashboard is not running for hibernated clusters
          </v-tooltip>
          <a v-else
            :href="dashboardUrl"
            target="_blank"
            rel="noopener"
          >
            {{dashboardUrlText}}
          </a>
        </g-list-item-content>
      </g-list-item>
      <g-list-item v-if="token">
        <g-list-item-content label="Token">
          <pre class="scroll">{{tokenText}}</pre>
        </g-list-item-content>
        <template v-slot:append>
          <g-copy-btn :clipboard-text="token"/>
          <g-action-button
            :icon="visibilityIcon"
            :tooltip="tokenVisibilityTitle"
            @click="showToken = !showToken"
          />
        </template>
      </g-list-item>
    </template>

    <v-divider v-if="isDashboardTileVisible && (isCredentialsTileVisible || isKubeconfigTileVisible || isGardenctlTileVisible)" inset></v-divider>

    <g-username-password v-if="isCredentialsTileVisible"
      :username="username"
      :password="password"
    />

    <v-divider v-if="isCredentialsTileVisible && (isKubeconfigTileVisible || isGardenctlTileVisible)" inset></v-divider>

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
    </template>

    <v-divider v-if="isKubeconfigTileVisible && isGardenctlTileVisible" inset></v-divider>

    <g-gardenctl-commands v-if="isGardenctlTileVisible"
      :shoot-item="shootItem"
    />
  </g-list>
</template>

<script>
import { defineComponent } from 'vue'
import { mapState } from 'pinia'

import { useAuthnStore, useAuthzStore, useTerminalStore } from '@/store'

import GList from '@/components/GList.vue'
import GListItem from '@/components/GListItem.vue'
import GListItemContent from '@/components/GListItemContent.vue'
import GActionButton from '@/components/GActionButton.vue'
import GCopyBtn from '@/components/GCopyBtn.vue'
import GUsernamePassword from '@/components/GUsernamePasswordListTile.vue'
import GTerminalListTile from '@/components/GTerminalListTile.vue'
import GLinkListTile from '@/components/GLinkListTile.vue'

import GTerminalShortcutsTile from './GTerminalShortcutsTile.vue'
import GShootKubeconfig from './GShootKubeconfig.vue'
import GGardenctlCommands from './GGardenctlCommands.vue'

import { shootItem } from '@/mixins/shootItem'

import get from 'lodash/get'
import isEmpty from 'lodash/isEmpty'

export default defineComponent({
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
  props: {
    hideTerminalShortcuts: {
      type: Boolean,
      default: false,
    },
  },
  data () {
    return {
      showToken: false,
    }
  },
  mixins: [shootItem],
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
      return !isEmpty(this.shootItem) && this.hasShootTerminalAccess && !this.isSeedUnreachable
    },
    isTerminalShortcutsTileVisible () {
      return !isEmpty(this.shootItem) && this.isTerminalShortcutsFeatureEnabled && this.hasShootTerminalAccess && !this.hideTerminalShortcuts && !this.isSeedUnreachable
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
  emits: ['addTerminalShortcut'],
  methods: {
    onAddTerminalShortcut (shortcut) {
      this.$emit('addTerminalShortcut', shortcut)
    },
  },
})
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
