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
    <v-list-tile v-show="!hasVisibleProperties">
      <v-list-tile-action>
        <v-icon class="cyan--text text--darken-2">mdi-alert-circle-outline</v-icon>
      </v-list-tile-action>
      <v-list-tile-content>
        <v-list-tile-title>
          Access information currently not available
        </v-list-tile-title>
      </v-list-tile-content>
    </v-list-tile>
    <template v-if="hasTerminalAccess">
      <terminal-list-tile
        :name=name
        :namespace=namespace
        target="shoot"
        description="Open terminal into cluster">
      </terminal-list-tile>
      <v-divider class="my-2" inset></v-divider>
    </template>
    <v-list-tile v-show="!!dashboardUrl">
      <v-list-tile-action>
        <v-icon class="cyan--text text--darken-2">developer_board</v-icon>
      </v-list-tile-action>
      <v-list-tile-content>
        <v-list-tile-sub-title>Dashboard</v-list-tile-sub-title>
        <v-list-tile-title>
          <v-tooltip v-if="isHibernated" top>
            <span slot="activator">{{dashboardUrlText}}</span>
            Dashboard is not running for hibernated clusters
          </v-tooltip>
          <a v-else :href="dashboardUrl" target="_blank" class="cyan--text text--darken-2">{{dashboardUrlText}}</a>
        </v-list-tile-title>
      </v-list-tile-content>
    </v-list-tile>
    <v-divider v-show="!!dashboardUrl && !!username && !!password" class="my-2" inset></v-divider>
    <username-password :username="username" :password="password"></username-password>
    <template v-if="!!kubeconfig">
      <v-divider class="my-2" inset></v-divider>
      <v-expansion-panel :value="expandKubeconfigIndex" readonly>
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
            <code-block lang="yaml" :content="info.kubeconfig" :show-copy-button="false"></code-block>
          </v-card>
        </v-expansion-panel-content>
      </v-expansion-panel>
    </template>
  </v-list>
</template>

<script>
import UsernamePassword from '@/components/UsernamePasswordListTile'
import CopyBtn from '@/components/CopyBtn'
import CodeBlock from '@/components/CodeBlock'
import TerminalListTile from '@/components/TerminalListTile'
import get from 'lodash/get'
import { isHibernated, getProjectName } from '@/utils'
import download from 'downloadjs'
import { mapGetters } from 'vuex'

export default {
  components: {
    UsernamePassword,
    CodeBlock,
    CopyBtn,
    TerminalListTile
  },
  props: {
    item: {
      type: Object
    }
  },
  data () {
    return {
      expandKubeconfigIndex: null
    }
  },
  computed: {
    ...mapGetters([
      'hasTerminalAccess'
    ]),
    dashboardUrl () {
      if (!this.hasDashboardEnabled) {
        return ''
      }
      return this.info.dashboardUrl || ''
    },
    dashboardUrlText () {
      return this.info.dashboardUrlText || ''
    },
    username () {
      return this.info.cluster_username || ''
    },
    password () {
      return this.info.cluster_password || ''
    },
    name () {
      return get(this.item, 'metadata.name')
    },
    namespace () {
      return get(this.item, 'metadata.namespace')
    },
    metadata () {
      return get(this.item, 'metadata')
    },
    info () {
      return get(this.item, 'info', {})
    },
    hasDashboardEnabled () {
      return get(this.item, 'spec.addons.kubernetes-dashboard.enabled', false) === true
    },
    isHibernated () {
      return isHibernated(get(this.item, 'spec'))
    },
    kubeconfig () {
      return get(this, 'info.kubeconfig')
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
      const projectName = getProjectName(this.metadata)
      return `kubeconfig--${projectName}--${this.name}.yaml`
    },
    hasVisibleProperties () {
      return !!this.dashboardUrl || (!!this.username && !!this.password) || !!this.kubeconfig || this.hasTerminalAccess
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

</style>
