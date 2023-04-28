<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div>
    <v-list-item>
      <v-list-item-icon>
        <v-icon color="primary">{{icon}}</v-icon>
      </v-list-item-icon>
      <v-list-item-content v-if="isGardenloginType">
        <v-list-item-title>Kubeconfig - Gardenlogin</v-list-item-title>
        <v-list-item-subtitle v-if="isKubeconfigAvailable" class="wrap-text">Does not contain credentials (requires <span class="font-family-monospace">gardenlogin</span> kubectl plugin)</v-list-item-subtitle>
        <v-list-item-subtitle v-else>Gardenlogin kubeconfig currently not available</v-list-item-subtitle>
      </v-list-item-content>
      <v-list-item-content v-else>
        <v-list-item-title>Kubeconfig - Static Token</v-list-item-title>
        <v-list-item-subtitle v-if="!shootEnableStaticTokenKubeconfig">Static token kubeconfig is disabled for this cluster</v-list-item-subtitle>
        <v-list-item-subtitle v-else-if="!isKubeconfigAvailable">Static token kubeconfig currently not available</v-list-item-subtitle>
        <v-list-item-subtitle class="wrap-text" v-else>Contains static token credential. Not recommended, consider disabling the static token kubeconfig</v-list-item-subtitle>
      </v-list-item-content>
      <v-list-item-action v-if="isGardenloginType" class="mx-0">
        <gardenlogin-info></gardenlogin-info>
      </v-list-item-action>
      <v-list-item-action class="mx-0" v-if="isKubeconfigAvailable">
        <v-tooltip location="top">
          <template v-slot:activator="{ on }">
            <v-btn v-on="on" icon @click.stop="onDownload" color="action-button">
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
        <v-tooltip location="top">
          <template v-slot:activator="{ on }">
            <v-btn v-on="on" icon @click.stop="toggleKubeconfig" color="action-button">
              <v-icon>{{kubeconfigVisibilityIcon}}</v-icon>
            </v-btn>
          </template>
          <span>{{kubeconfigVisibilityTitle}}</span>
        </v-tooltip>
      </v-list-item-action>
      <v-list-item-action v-if="!isGardenloginType" class="mx-0">
        <static-token-kubeconfig-configuration :shootItem="shootItem"></static-token-kubeconfig-configuration>
      </v-list-item-action>
    </v-list-item>
    <v-list-item v-if="kubeconfigExpansionPanel" key="expansion-gardenlogin-kubeconfig">
      <v-list-item-icon></v-list-item-icon>
      <v-list-item-content class="pt-0">
        <code-block lang="yaml" :content="kubeconfig" :show-copy-button="false"></code-block>
      </v-list-item-content>
    </v-list-item>
  </div>
</template>

<script>
import CopyBtn from '@/components/CopyBtn.vue'
import CodeBlock from '@/components/CodeBlock.vue'
import GardenloginInfo from '@/components/GardenloginInfo.vue'
import StaticTokenKubeconfigConfiguration from '@/components/StaticTokenKubeconfigConfiguration.vue'
import download from 'downloadjs'
import { shootItem } from '@/mixins/shootItem'

export default {
  components: {
    CopyBtn,
    CodeBlock,
    GardenloginInfo,
    StaticTokenKubeconfigConfiguration
  },
  mixins: [shootItem],
  props: {
    showListIcon: {
      type: Boolean,
      default: false
    },
    type: {
      type: String,
      default: 'gardenlogin'
    }
  },
  data () {
    return {
      kubeconfigExpansionPanel: false
    }
  },
  computed: {
    icon () {
      return this.showListIcon ? 'mdi-file' : ''
    },
    kubeconfig () {
      return this.isGardenloginType
        ? this.shootInfo?.kubeconfigGardenlogin
        : this.shootInfo?.kubeconfig
    },
    isKubeconfigAvailable () {
      return !!this.kubeconfig
    },
    kubeconfigVisibilityIcon () {
      return this.kubeconfigExpansionPanel ? 'mdi-eye-off' : 'mdi-eye'
    },
    kubeconfigVisibilityTitle () {
      return this.kubeconfigExpansionPanel ? 'Hide Kubeconfig' : 'Show Kubeconfig'
    },
    isGardenloginType () {
      return this.type === 'gardenlogin'
    },
    getQualifiedName () {
      const prefix = this.isGardenloginType ? 'kubeconfig-gardenlogin' : 'kubeconfig'
      return `${prefix}--${this.shootProjectName}--${this.shootName}.yaml`
    }
  },
  methods: {
    toggleKubeconfig () {
      this.kubeconfigExpansionPanel = !this.kubeconfigExpansionPanel
    },
    reset () {
      this.kubeconfigExpansionPanel = false
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
