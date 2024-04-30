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
      target="shoot"
      :description="shootTerminalDescription"
      :button-description="shootTerminalButtonDescription"
      :disabled="shootTerminalButtonDisabled"
    />

    <v-divider
      v-if="isTerminalTileVisible && (isTerminalShortcutsTileVisible || isDashboardTileVisible || isKubeconfigTileVisible || isGardenctlTileVisible)"
      inset
    />

    <g-terminal-shortcuts-tile
      v-if="isTerminalShortcutsTileVisible"
      popper-boundaries-selector="#accessCardList"
      @add-terminal-shortcut="onAddTerminalShortcut"
    />

    <v-divider
      v-if="isTerminalShortcutsTileVisible && (isDashboardTileVisible || isKubeconfigTileVisible || isGardenctlTileVisible)"
      inset
    />

    <template v-if="isDashboardTileVisible">
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
                >{{ dashboardUrl }}</span>
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
              {{ dashboardUrl }}
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
      v-if="isDashboardTileVisible && (isKubeconfigTileVisible || isGardenctlTileVisible)"
      inset
    />
    <template v-if="isKubeconfigTileVisible">
      <g-shoot-kubeconfig
        :show-list-icon="true"
        type="gardenlogin"
      />
      <g-shoot-kubeconfig
        :show-list-icon="false"
        type="token"
      />
      <g-shoot-admin-kubeconfig />
    </template>

    <v-divider
      v-if="isKubeconfigTileVisible && isGardenctlTileVisible"
      inset
    />

    <g-gardenctl-commands
      v-if="isGardenctlTileVisible"
    />
  </g-list>
</template>

<script>
import { toRefs } from 'vue'
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
import GTerminalListTile from '@/components/GTerminalListTile.vue'

import {
  useShootItem,
  useProvideShootItem,
} from '@/composables/useShootItem'

import GGardenctlCommands from './GGardenctlCommands.vue'
import GShootKubeconfig from './GShootKubeconfig.vue'
import GShootAdminKubeconfig from './GShootAdminKubeconfig.vue'
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
    GCopyBtn,
    GTerminalListTile,
    GShootKubeconfig,
    GShootAdminKubeconfig,
    GGardenctlCommands,
    GTerminalShortcutsTile,
  },
  props: {
    selectedShoot: {
      type: Object,
    },
    hideTerminalShortcuts: {
      type: Boolean,
      default: false,
    },
  },
  emits: [
    'addTerminalShortcut',
  ],
  setup (props) {
    const { selectedShoot } = toRefs(props)
    const {
      shootItem,
      shootInfo,
      isShootStatusHibernated,
      hasShootWorkerGroups,
      isSeedUnreachable,
    } = selectedShoot.value
      ? useProvideShootItem(selectedShoot)
      : useShootItem()

    return {
      shootItem,
      shootInfo,
      isShootStatusHibernated,
      hasShootWorkerGroups,
      isSeedUnreachable,
    }
  },
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
      'canCreateShootsViewerkubeconfig',
      'hasControlPlaneTerminalAccess',
      'canPatchShoots',
    ]),
    ...mapState(useTerminalStore, [
      'isTerminalShortcutsFeatureEnabled',
    ]),
    ...mapState(useConfigStore, [
      'shootAdminKubeconfig',
    ]),
    dashboardUrl () {
      if (!this.hasDashboardEnabled) {
        return ''
      }

      if (!this.shootInfo.dashboardUrlPath) {
        return ''
      }
      const pathname = this.shootInfo.dashboardUrlPath
      return `http://localhost:8001${pathname}`
    },
    hasDashboardEnabled () {
      return get(this.shootItem, 'spec.addons.kubernetesDashboard.enabled', false) === true
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
      return this.isDashboardTileVisible || this.isKubeconfigTileVisible || this.isTerminalTileVisible || this.isGardenctlTileVisible
    },
    isDashboardTileVisible () {
      return !!this.dashboardUrl
    },
    isKubeconfigTileVisible () {
      return !!this.kubeconfigGardenlogin || this.canPatchShoots
    },
    isGardenctlTileVisible () {
      return this.canCreateShootsViewerkubeconfig || this.canCreateShootsAdminkubeconfig
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
