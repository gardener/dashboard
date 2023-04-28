<!--
SPDX-FileCopyrightText: 2021 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <v-list key="accessCardList">
    <v-list-item v-show="!isAnyTileVisible">
      <v-list-item-icon>
        <v-icon color="primary">mdi-alert-circle-outline</v-icon>
      </v-list-item-icon>
      <v-list-item-content>
        <v-list-item-title>
          Access information currently not available
        </v-list-item-title>
      </v-list-item-content>
    </v-list-item>

    <terminal-list-tile
      v-if="isTerminalTileVisible"
      :shoot-item=shootItem
      target="shoot"
      :description="shootTerminalDescription"
      :button-description="shootTerminalButtonDescription"
      :disabled="shootTerminalButtonDisabled"
      >
    </terminal-list-tile>

    <v-divider v-if="isTerminalTileVisible && (isTerminalShortcutsTileVisible || isDashboardTileVisible || isCredentialsTileVisible || isKubeconfigTileVisible || isGardenctlTileVisible)" inset></v-divider>

    <terminal-shortcuts-tile
      v-if="isTerminalShortcutsTileVisible"
      :shoot-item="shootItem"
      @add-terminal-shortcut="onAddTerminalShortcut"
      popper-boundaries-selector="#accessCardList"
      class="mt-3"
    ></terminal-shortcuts-tile>

    <v-divider v-if="isTerminalShortcutsTileVisible && (isDashboardTileVisible || isCredentialsTileVisible || isKubeconfigTileVisible || isGardenctlTileVisible)" inset></v-divider>

    <link-list-tile v-if="isDashboardTileVisible && !hasDashboardTokenAuth" icon="mdi-developer-board" app-title="Dashboard" :url="dashboardUrl" :url-text="dashboardUrlText" :is-shoot-status-hibernated="isShootStatusHibernated"></link-list-tile>

    <template v-if="isDashboardTileVisible && hasDashboardTokenAuth">
      <v-list-item>
        <v-list-item-icon>
          <v-icon color="primary">mdi-developer-board</v-icon>
        </v-list-item-icon>
        <v-list-item-content>
          <v-list-item-subtitle>Dashboard</v-list-item-subtitle>
          <v-list-item-subtitle class="text-caption wrap-text py-2">
            Access Dashboard using the kubectl command-line tool by running the following command:
            <code>kubectl proxy</code>.
            Kubectl will make Dashboard available at:
          </v-list-item-subtitle>
          <v-list-item-title>
            <v-tooltip v-if="isShootStatusHibernated" location="top">
              <template v-slot:activator="{ on }">
                <span v-on="on" class="text-grey">{{dashboardUrlText}}</span>
              </template>
              Dashboard is not running for hibernated clusters
            </v-tooltip>
            <a v-else :href="dashboardUrl" target="_blank" rel="noopener">{{dashboardUrlText}}</a>
          </v-list-item-title>
        </v-list-item-content>
      </v-list-item>
      <v-list-item v-if="token">
        <v-list-item-icon/>
        <v-list-item-content class="pt-0">
          <v-list-item-subtitle>Token</v-list-item-subtitle>
          <v-list-item-title class="pt-1">
            <pre class="scroll">{{tokenText}}</pre>
          </v-list-item-title>
        </v-list-item-content>
        <v-list-item-action class="mx-0">
          <copy-btn :clipboard-text="token"></copy-btn>
        </v-list-item-action>
        <v-list-item-action class="mx-0">
          <v-tooltip location="top">
            <template v-slot:activator="{ on }">
              <v-btn v-on="on" icon @click.stop="showToken = !showToken" color="action-button">
                <v-icon>{{visibilityIcon}}</v-icon>
              </v-btn>
            </template>
            <span>{{tokenVisibilityTitle}}</span>
          </v-tooltip>
        </v-list-item-action>
      </v-list-item>
    </template>

    <v-divider v-if="isDashboardTileVisible && (isCredentialsTileVisible || isKubeconfigTileVisible || isGardenctlTileVisible)" inset></v-divider>

    <username-password v-if="isCredentialsTileVisible" :username="username" :password="password"></username-password>

    <v-divider v-if="isCredentialsTileVisible && (isKubeconfigTileVisible || isGardenctlTileVisible)" inset></v-divider>

    <v-list v-if="isKubeconfigTileVisible">
      <shoot-kubeconfig :shoot-item="shootItem" :showIcon="true" type="gardenlogin"></shoot-kubeconfig>
      <shoot-kubeconfig :shoot-item="shootItem" :showIcon="false" type="token"></shoot-kubeconfig>
    </v-list>

    <v-divider v-if="isKubeconfigTileVisible && isGardenctlTileVisible" inset></v-divider>

    <gardenctl-commands v-if="isGardenctlTileVisible" :shoot-item="shootItem"></gardenctl-commands>
  </v-list>
</template>

<script>
import UsernamePassword from '@/components/UsernamePasswordListTile.vue'
import CopyBtn from '@/components/CopyBtn.vue'
import TerminalListTile from '@/components/TerminalListTile.vue'
import TerminalShortcutsTile from '@/components/ShootDetails/TerminalShortcutsTile.vue'
import ShootKubeconfig from '@/components/ShootDetails/ShootKubeconfig.vue'
import GardenctlCommands from '@/components/ShootDetails/GardenctlCommands.vue'
import LinkListTile from '@/components/LinkListTile.vue'
import get from 'lodash/get'
import isEmpty from 'lodash/isEmpty'
import { shootItem } from '@/mixins/shootItem'
import { mapState, mapGetters } from 'vuex'

export default {
  components: {
    UsernamePassword,
    CopyBtn,
    TerminalListTile,
    LinkListTile,
    ShootKubeconfig,
    GardenctlCommands,
    TerminalShortcutsTile
  },
  props: {
    hideTerminalShortcuts: {
      type: Boolean,
      default: false
    }
  },
  data () {
    return {
      showToken: false
    }
  },
  mixins: [shootItem],
  computed: {
    ...mapGetters([
      'hasShootTerminalAccess',
      'isAdmin',
      'canCreateShootsAdminkubeconfig',
      'hasControlPlaneTerminalAccess',
      'isTerminalShortcutsFeatureEnabled',
      'canPatchShoots'
    ]),
    ...mapState([
      'cfg'
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
    }
  },
  methods: {
    onAddTerminalShortcut (shortcut) {
      this.$emit('add-terminal-shortcut', shortcut)
    }
  }
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
