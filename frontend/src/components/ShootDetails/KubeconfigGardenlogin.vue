<!--
SPDX-FileCopyrightText: 2022 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <div>
    <v-list-item>
      <v-list-item-icon>
        <v-icon color="primary">mdi-file</v-icon>
      </v-list-item-icon>
      <v-list-item-content>
        <v-list-item-title>Kubeconfig - Gardenlogin</v-list-item-title>
        <v-list-item-subtitle class="wrap-text">Does not contain credentials (requires <span class="font-family-monospace">gardenlogin</span> kubectl plugin)</v-list-item-subtitle>
      </v-list-item-content>
      <v-list-item-action class="mx-0">
        <v-tooltip top>
          <template v-slot:activator="{ on }">
            <v-btn v-on="on" icon @click.native.stop="onDownload" color="action-button">
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
            <v-btn v-on="on" icon @click.native.stop="toggleKubeconfig" color="action-button">
              <v-icon>{{kubeconfigVisibilityIcon}}</v-icon>
            </v-btn>
          </template>
          <span>{{kubeconfigVisibilityTitle}}</span>
        </v-tooltip>
      </v-list-item-action>
      <v-list-item-action class="mx-0">
        <v-tooltip top>
          <template v-slot:activator="{ on }">
            <v-btn v-on="on" icon @click.native.stop="toggleInfo" color="action-button">
              <v-icon>{{infoExpansionPanelIcon}}</v-icon>
            </v-btn>
          </template>
          <span>{{infoVisibilityTitle}}</span>
        </v-tooltip>
      </v-list-item-action>
    </v-list-item>
    <v-list-item v-if="kubeconfigExpansionPanel" key="expansion-gardenlogin-kubeconfig">
      <v-list-item-icon></v-list-item-icon>
      <v-list-item-content class="pt-0">
        <code-block lang="yaml" :content="kubeconfig" :show-copy-button="false"></code-block>
      </v-list-item-content>
    </v-list-item>
    <v-list-item v-if="infoExpansionPanel" key="expansion-gardenlogin-info">
      <v-list-item-icon></v-list-item-icon>
      <v-list-item-content class="pt-0">
        <v-list-item-subtitle class="wrap-text">
          <p>
            The downloaded <span class="font-family-monospace">kubeconfig</span> will transparently handle the
            authentication via <span class="font-family-monospace">gardenlogin</span> kubectl credential plugin.
          </p>
          <p>
            If not already done, please
            <external-link url="https://github.com/gardener/gardenlogin#installation">install</external-link>
            <span class="font-family-monospace pl-1">gardenlogin</span> and
            <external-link url="https://github.com/gardener/gardenlogin#configure-gardenlogin">configure</external-link>
            it accordingly.
          </p>
          <p>
            Following is an example config file for <span class="font-family-monospace pl-1">gardenlogin</span>.
          </p>
          <gardenctl-v2-config-example></gardenctl-v2-config-example>
        </v-list-item-subtitle>
      </v-list-item-content>
    </v-list-item>
  </div>
</template>

<script>
import CopyBtn from '@/components/CopyBtn'
import CodeBlock from '@/components/CodeBlock'
import ExternalLink from '@/components/ExternalLink'
import GardenctlV2ConfigExample from '@/components/GardenctlV2ConfigExample'
import download from 'downloadjs'
import { shootItem } from '@/mixins/shootItem'

export default {
  components: {
    CopyBtn,
    CodeBlock,
    ExternalLink,
    GardenctlV2ConfigExample
  },
  mixins: [shootItem],
  data () {
    return {
      kubeconfigExpansionPanel: false,
      infoExpansionPanel: false
    }
  },
  computed: {
    kubeconfig () {
      return this.shootInfo?.kubeconfigGardenlogin
    },
    infoExpansionPanelIcon () {
      return this.infoExpansionPanel ? 'mdi-chevron-up' : 'mdi-chevron-down'
    },
    infoVisibilityTitle () {
      return this.infoExpansionPanel ? 'Hide Info' : 'Show Info'
    },
    kubeconfigVisibilityIcon () {
      return this.kubeconfigExpansionPanel ? 'mdi-eye-off' : 'mdi-eye'
    },
    kubeconfigVisibilityTitle () {
      return this.kubeconfigExpansionPanel ? 'Hide Kubeconfig' : 'Show Kubeconfig'
    },
    getQualifiedName () {
      return `kubeconfig-gardenlogin--${this.shootProjectName}--${this.shootName}.yaml`
    }
  },
  methods: {
    toggleKubeconfig () {
      this.kubeconfigExpansionPanel = !this.kubeconfigExpansionPanel
      this.infoExpansionPanel = false
    },
    toggleInfo () {
      this.infoExpansionPanel = !this.infoExpansionPanel
      this.kubeconfigExpansionPanel = false
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
