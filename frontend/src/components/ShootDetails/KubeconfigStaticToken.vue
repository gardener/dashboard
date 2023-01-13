<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div>
    <v-list-item>
      <v-list-item-icon></v-list-item-icon>
      <v-list-item-content>
        <v-list-item-title>Kubeconfig - Static Token</v-list-item-title>
        <v-list-item-subtitle v-if="!shootEnableStaticTokenKubeconfig">Static token kubeconfig is disabled for this cluster</v-list-item-subtitle>
        <v-list-item-subtitle v-else-if="!isKubeconfigAvailable">Static token kubeconfig currently not available</v-list-item-subtitle>
        <v-list-item-subtitle class="wrap-text" v-else>Contains static token credential. Not recommended, consider disabling the static token kubeconfig</v-list-item-subtitle>
      </v-list-item-content>
      <v-list-item-action class="mx-0" v-if="isKubeconfigAvailable">
        <v-tooltip top>
          <template v-slot:activator="{ on }">
            <v-btn v-on="on" icon @click.native.stop="onDownload" color="action-button">
              <v-icon>mdi-download</v-icon>
            </v-btn>
          </template>
          <span>Download Kubeconfig</span>
        </v-tooltip>
      </v-list-item-action>
      <v-list-item-action class="mx-0" v-if="isKubeconfigAvailable">
        <copy-btn :clipboard-text="kubeconfig"></copy-btn>
      </v-list-item-action>
      <v-list-item-action class="mx-0" v-if="isKubeconfigAvailable">
        <v-tooltip top>
          <template v-slot:activator="{ on }">
            <v-btn v-on="on" icon @click.native.stop="expansionPanelKubeconfig = !expansionPanelKubeconfig" color="action-button">
              <v-icon>{{visibilityIconKubeconfig}}</v-icon>
            </v-btn>
          </template>
          <span>{{kubeconfigVisibilityTitle}}</span>
        </v-tooltip>
      </v-list-item-action>
      <v-list-item-action class="mx-0">
        <static-token-kubeconfig-configuration :shootItem="shootItem"></static-token-kubeconfig-configuration>
      </v-list-item-action>
    </v-list-item>
    <v-list-item v-if="expansionPanelKubeconfig" key="expansion-static-token-kubeconfig">
      <v-list-item-icon></v-list-item-icon>
      <v-list-item-content class="pt-0">
        <code-block lang="yaml" :content="kubeconfig" :show-copy-button="false"></code-block>
      </v-list-item-content>
    </v-list-item>
  </div>
</template>

<script>
import CopyBtn from '@/components/CopyBtn'
import CodeBlock from '@/components/CodeBlock'
import download from 'downloadjs'
import { shootItem } from '@/mixins/shootItem'
import StaticTokenKubeconfigConfiguration from '@/components/StaticTokenKubeconfigConfiguration'

export default {
  components: {
    CopyBtn,
    CodeBlock,
    StaticTokenKubeconfigConfiguration
  },
  mixins: [shootItem],
  data () {
    return {
      expansionPanelKubeconfig: false
    }
  },
  computed: {
    kubeconfig () {
      return this.shootInfo?.kubeconfig
    },
    visibilityIconKubeconfig () {
      return this.expansionPanelKubeconfig ? 'mdi-eye-off' : 'mdi-eye'
    },
    kubeconfigVisibilityTitle () {
      return this.expansionPanelKubeconfig ? 'Hide Kubeconfig' : 'Show Kubeconfig'
    },
    isKubeconfigAvailable () {
      return !!this.kubeconfig
    },
    getQualifiedName () {
      return `kubeconfig--${this.shootProjectName}--${this.shootName}.yaml`
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
    }
  },
  watch: {
    kubeconfig (value) {
      this.reset()
    }
  }
}
</script>
