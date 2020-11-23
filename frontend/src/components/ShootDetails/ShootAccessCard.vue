<!--
SPDX-FileCopyrightText: 2020 SAP SE or an SAP affiliate company and Gardener contributors

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
      :buttonDescription="shootTerminalButtonDescription"
      :disabled="shootTerminalButtonDisabled"
      >
    </terminal-list-tile>

    <v-divider v-if="isTerminalTileVisible && (isTerminalShortcutsTileVisible || isDashboardTileVisible || isCredentialsTileVisible || isKubeconfigTileVisible || isGardenctlTileVisible)" inset></v-divider>

    <terminal-shortcuts-tile
      v-if="isTerminalShortcutsTileVisible"
      :shootItem="shootItem"
      @addTerminalShortcut="onAddTerminalShortcut"
      popper-boundaries-selector="#accessCardList"
      class="mt-3"
    ></terminal-shortcuts-tile>

    <v-divider v-if="isTerminalShortcutsTileVisible && (isDashboardTileVisible || isCredentialsTileVisible || isKubeconfigTileVisible || isGardenctlTileVisible)" inset></v-divider>

    <link-list-tile v-if="isDashboardTileVisible && !hasDashboardTokenAuth" icon="mdi-developer-board" appTitle="Dashboard" :url="dashboardUrl" :urlText="dashboardUrlText" :isShootStatusHibernated="isShootStatusHibernated"></link-list-tile>

    <template v-if="isDashboardTileVisible && hasDashboardTokenAuth">
      <v-list-item>
        <v-list-item-icon>
          <v-icon color="primary">mdi-developer-board</v-icon>
        </v-list-item-icon>
        <v-list-item-content>
          <v-list-item-subtitle>Dashboard</v-list-item-subtitle>
          <v-list-item-subtitle class="caption wrap-text py-2">
            Access Dashboard using the kubectl command-line tool by running the following command:
            <code>kubectl proxy</code>.
            Kubectl will make Dashboard available at:
          </v-list-item-subtitle>
          <v-list-item-title>
            <v-tooltip v-if="isShootStatusHibernated" top>
              <template v-slot:activator="{ on }">
                <span v-on="on" class="grey--text">{{dashboardUrlText}}</span>
              </template>
              Dashboard is not running for hibernated clusters
            </v-tooltip>
            <a v-else :href="dashboardUrl" target="_blank">{{dashboardUrlText}}</a>
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
          <v-tooltip top>
            <template v-slot:activator="{ on }">
              <v-btn v-on="on" icon @click.native.stop="showToken = !showToken" color="actionButton">
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

    <v-list-item v-if="isKubeconfigTileVisible">
      <v-list-item-icon>
        <v-icon color="primary">mdi-file</v-icon>
      </v-list-item-icon>
      <v-list-item-content>
        <v-list-item-title>Kubeconfig</v-list-item-title>
      </v-list-item-content>
      <v-list-item-action class="mx-0">
        <v-tooltip top>
          <template v-slot:activator="{ on }">
            <v-btn v-on="on" icon @click.native.stop="onDownload" color="actionButton">
              <v-icon>mdi-download</v-icon>
            </v-btn>
          </template>
          <span>Download Kubeconfig</span>
        </v-tooltip>
      </v-list-item-action>
      <v-list-item-action class="mx-0">
        <copy-btn :clipboard-text="kubeconfig"></copy-btn>
      </v-list-item-action>
      <v-list-item-action class="mx-0">
        <v-tooltip top>
          <template v-slot:activator="{ on }">
            <v-btn v-on="on" icon @click.native.stop="expansionPanelKubeconfig = !expansionPanelKubeconfig" color="actionButton">
              <v-icon>{{visibilityIconKubeconfig}}</v-icon>
            </v-btn>
          </template>
          <span>{{kubeconfigVisibilityTitle}}</span>
        </v-tooltip>
      </v-list-item-action>
    </v-list-item>
    <v-expand-transition>
      <v-card v-if="expansionPanelKubeconfig" flat>
        <code-block lang="yaml" :content="shootInfo.kubeconfig" :show-copy-button="false"></code-block>
      </v-card>
    </v-expand-transition>

    <v-divider v-if="isKubeconfigTileVisible && isGardenctlTileVisible" inset></v-divider>

    <gardenctl-commands v-if="isGardenctlTileVisible" :shootItem="shootItem"></gardenctl-commands>
  </v-list>
</template>

<script>
import UsernamePassword from '@/components/UsernamePasswordListTile'
import CopyBtn from '@/components/CopyBtn'
import CodeBlock from '@/components/CodeBlock'
import TerminalListTile from '@/components/TerminalListTile'
import TerminalShortcutsTile from '@/components/ShootDetails/TerminalShortcutsTile'
import GardenctlCommands from '@/components/ShootDetails/GardenctlCommands'
import LinkListTile from '@/components/LinkListTile'
import get from 'lodash/get'
import isEmpty from 'lodash/isEmpty'
import download from 'downloadjs'
import { shootItem } from '@/mixins/shootItem'
import { mapState, mapGetters } from 'vuex'

export default {
  components: {
    UsernamePassword,
    CodeBlock,
    CopyBtn,
    TerminalListTile,
    LinkListTile,
    GardenctlCommands,
    TerminalShortcutsTile
  },
  props: {
    shootItem: {
      type: Object
    },
    hideTerminalShortcuts: {
      type: Boolean,
      default: false
    }
  },
  data () {
    return {
      expansionPanelKubeconfig: false,
      showToken: false
    }
  },
  mixins: [shootItem],
  computed: {
    ...mapGetters([
      'hasShootTerminalAccess',
      'isAdmin',
      'hasControlPlaneTerminalAccess',
      'isTerminalShortcutsFeatureEnabled'
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
    visibilityIconKubeconfig () {
      return this.expansionPanelKubeconfig ? 'mdi-eye-off' : 'mdi-eye'
    },
    kubeconfigVisibilityTitle () {
      return this.expansionPanelKubeconfig ? 'Hide Kubeconfig' : 'Show Kubeconfig'
    },
    getQualifiedName () {
      return `kubeconfig--${this.shootProjectName}--${this.shootName}.yaml`
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
      return !!this.kubeconfig
    },
    isGardenctlTileVisible () {
      return this.isAdmin
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
    reset () {
      this.expansionPanelKubeconfig = false
    },
    onDownload () {
      const kubeconfig = this.kubeconfig
      if (kubeconfig) {
        download(kubeconfig, this.getQualifiedName, 'text/yaml')
      }
    },
    onAddTerminalShortcut (shortcut) {
      this.$emit('addTerminalShortcut', shortcut)
    }
  },
  watch: {
    kubeconfig (value) {
      this.reset()
    }
  }
}
</script>

<style lang="scss" scoped>

  .scroll {
    overflow-x: scroll;
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
