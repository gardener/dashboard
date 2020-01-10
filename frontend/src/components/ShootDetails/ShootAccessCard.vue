<!--
Copyright (c) 2019 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
-->

<template>
  <v-list>
    <v-list-tile v-show="!isAnyTileVisible">
      <v-list-tile-action>
        <v-icon class="cyan--text text--darken-2">mdi-alert-circle-outline</v-icon>
      </v-list-tile-action>
      <v-list-tile-content>
        <v-list-tile-title>
          Access information currently not available
        </v-list-tile-title>
      </v-list-tile-content>
    </v-list-tile>
    <terminal-list-tile
      v-if="isTerminalTileVisible"
      :shoot-item=shootItem
      target="shoot"
      :description="shootTerminalDescription"
      :buttonDescription="shootTerminalButtonDescription"
      :disabled="!isAdmin && isShootStatusHibernated"
      >
    </terminal-list-tile>

    <v-divider v-if="isTerminalTileVisible && (isDashboardTileVisible || isCredentialsTileVisible || isKubeconfigTileVisible)" class="my-2" inset></v-divider>

    <link-list-tile v-if="isDashboardTileVisible && !hasDashboardTokenAuth" icon="developer_board" appTitle="Dashboard" :url="dashboardUrl" :urlText="dashboardUrlText" :isShootStatusHibernated="isShootStatusHibernated"></link-list-tile>

    <template v-if="isDashboardTileVisible && hasDashboardTokenAuth">
      <v-list-tile>
        <v-list-tile-action>
          <v-icon class="cyan--text text--darken-2">developer_board</v-icon>
        </v-list-tile-action>
        <v-list-tile-content>
          <v-list-tile-sub-title>Dashboard</v-list-tile-sub-title>
        </v-list-tile-content>
      </v-list-tile>
      <v-list-tile>
        <v-list-tile-action>
        </v-list-tile-action>
        <v-list-tile-content>
          <v-list-tile-action-text>Access Dashboard using the kubectl command-line tool by running the following command: <code>kubectl proxy</code>. Kubectl will make Dashboard available at:</v-list-tile-action-text>
        </v-list-tile-content>
      </v-list-tile>
      <v-list-tile>
        <v-list-tile-action>
        </v-list-tile-action>
        <v-list-tile-content>
          <v-list-tile-title>
            <v-tooltip v-if="isShootStatusHibernated" top>
              <span class="grey--text" slot="activator">{{dashboardUrlText}}</span>
              Dashboard is not running for hibernated clusters
            </v-tooltip>
            <a v-else :href="dashboardUrl" target="_blank" class="cyan--text text--darken-2">{{dashboardUrlText}}</a>
          </v-list-tile-title>
        </v-list-tile-content>
      </v-list-tile>
      <v-list-tile v-if="token">
        <v-list-tile-action>
        </v-list-tile-action>
        <v-list-tile-content>
          <v-list-tile-sub-title>Token</v-list-tile-sub-title>
          <v-list-tile-title><pre class="scroll">{{tokenText}}</pre></v-list-tile-title>
        </v-list-tile-content>
        <v-list-tile-action>
          <copy-btn :clipboard-text="token"></copy-btn>
        </v-list-tile-action>
        <v-list-tile-action>
          <v-tooltip top>
            <v-btn slot="activator" icon @click.native.stop="showToken = !showToken">
              <v-icon>{{visibilityIcon}}</v-icon>
            </v-btn>
            <span>{{tokenVisibilityTitle}}</span>
          </v-tooltip>
        </v-list-tile-action>
      </v-list-tile>
    </template>

    <v-divider v-if="isDashboardTileVisible && (isCredentialsTileVisible || isKubeconfigTileVisible)" class="my-2" inset></v-divider>

    <username-password v-if="isCredentialsTileVisible" :username="username" :password="password"></username-password>

    <v-divider v-if="isCredentialsTileVisible && isKubeconfigTileVisible" class="my-2" inset></v-divider>

    <v-expansion-panel v-if="isKubeconfigTileVisible" :value="expandKubeconfigIndex" readonly>
      <v-expansion-panel-content hide-actions>
        <v-list-tile slot="header">
          <v-list-tile-action>
            <v-icon class="cyan--text text--darken-2">insert_drive_file</v-icon>
          </v-list-tile-action>
          <v-list-tile-content>
            <v-list-tile-title>Kubeconfig</v-list-tile-title>
          </v-list-tile-content>
          <v-list-tile-action>
            <v-tooltip top>
              <v-btn slot="activator" icon @click.native.stop="onDownload">
                <v-icon>mdi-download</v-icon>
              </v-btn>
              <span>Download Kubeconfig</span>
            </v-tooltip>
          </v-list-tile-action>
          <v-list-tile-action>
            <copy-btn :clipboard-text="kubeconfig"></copy-btn>
          </v-list-tile-action>
          <v-list-tile-action>
            <v-tooltip top>
              <v-btn slot="activator" icon @click.native.stop="isKubeconfigVisible ? hideKubekonfig() : showKubeconfig()">
                <v-icon>{{visibilityIconKubeconfig}}</v-icon>
              </v-btn>
              <span>{{kubeconfigVisibilityTitle}}</span>
            </v-tooltip>
          </v-list-tile-action>
        </v-list-tile>
        <v-card>
          <code-block lang="yaml" :content="shootInfo.kubeconfig" :show-copy-button="false"></code-block>
        </v-card>
      </v-expansion-panel-content>
    </v-expansion-panel>
  </v-list>
</template>

<script>
import UsernamePassword from '@/components/UsernamePasswordListTile'
import CopyBtn from '@/components/CopyBtn'
import CodeBlock from '@/components/CodeBlock'
import TerminalListTile from '@/components/TerminalListTile'
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
    LinkListTile
  },
  props: {
    shootItem: {
      type: Object
    }
  },
  data () {
    return {
      expandKubeconfigIndex: null,
      showToken: false
    }
  },
  mixins: [shootItem],
  computed: {
    ...mapGetters([
      'hasShootTerminalAccess',
      'isAdmin',
      'hasControlPlaneTerminalAccess'
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
      if (this.isKubeconfigVisible) {
        return 'visibility_off'
      } else {
        return 'visibility'
      }
    },
    kubeconfigVisibilityTitle () {
      if (this.isKubeconfigVisible) {
        return 'Hide Kubeconfig'
      } else {
        return 'Show Kubeconfig'
      }
    },
    isKubeconfigVisible () {
      return this.expandKubeconfigIndex === 0
    },
    getQualifiedName () {
      return `kubeconfig--${this.shootProjectName}--${this.shootName}.yaml`
    },
    shootTerminalButtonDescription () {
      if (this.isShootStatusHibernated) {
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
    isTerminalTileVisible () {
      return !isEmpty(this.shootItem) && this.hasShootTerminalAccess
    },
    token () {
      return this.shootInfo.cluster_token || ''
    },
    tokenText () {
      if (this.showToken) {
        return this.token
      } else {
        return '****************'
      }
    },
    tokenVisibilityTitle () {
      if (this.showToken) {
        return 'Hide token'
      } else {
        return 'Show token'
      }
    },
    visibilityIcon () {
      if (this.showToken) {
        return 'visibility_off'
      } else {
        return 'visibility'
      }
    }
  },
  methods: {
    reset () {
      this.hideKubekonfig()
    },
    hideKubekonfig () {
      this.expandKubeconfigIndex = null
    },
    showKubeconfig () {
      this.expandKubeconfigIndex = 0
    },
    onDownload () {
      const kubeconfig = this.kubeconfig
      if (kubeconfig) {
        download(kubeconfig, this.getQualifiedName, 'text/yaml')
      }
    }
  },
  watch: {
    kubeconfig (value) {
      this.reset()
    }
  }
}
</script>

<style lang="styl" scoped>
  .v-expansion-panel {
    box-shadow: none;
  }

  >>> .v-expansion-panel__header {
    cursor: auto;
    padding: 0;
  }

  .scroll {
    overflow-x: scroll;
  }

</style>
