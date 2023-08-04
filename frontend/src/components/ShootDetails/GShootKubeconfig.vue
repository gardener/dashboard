<!--
SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors

SPDX-License-Identifier: Apache-2.0
-->

<template>
  <g-list-item>
    <template #prepend>
      <v-icon
        :icon="icon"
        color="primary"
      />
    </template>
    <g-list-item-content v-if="isGardenloginType">
      Kubeconfig - Gardenlogin
      <div class="text-body-2">
        <span
          v-if="isKubeconfigAvailable"
          class="wrap-text"
        >
          Does not contain credentials
          (requires <span class="font-family-monospace">gardenlogin</span> kubectl plugin)
        </span>
        <span v-else>
          Gardenlogin kubeconfig currently not available
        </span>
      </div>
    </g-list-item-content>
    <g-list-item-content v-else>
      Kubeconfig - Static Token
      <div class="text-body-2">
        <span v-if="!shootEnableStaticTokenKubeconfig">
          Static token kubeconfig is disabled for this cluster
        </span>
        <span v-else-if="!isKubeconfigAvailable">
          Static token kubeconfig currently not available
        </span>
        <span
          v-else
          class="wrap-text"
        >
          Contains static token credential.
          Not recommended, consider disabling the static token kubeconfig
        </span>
      </div>
    </g-list-item-content>
    <template #append>
      <g-gardenlogin-info v-if="isGardenloginType" />
      <template v-if="isKubeconfigAvailable">
        <g-action-button
          icon="mdi-download"
          tooltip="Download Kubeconfig"
          @click.stop="onDownload"
        />
        <g-copy-btn :clipboard-text="kubeconfig" />
        <g-action-button
          :icon="kubeconfigVisibilityIcon"
          :tooltip="kubeconfigVisibilityTitle"
          @click.stop="kubeconfigExpansionPanel = !kubeconfigExpansionPanel"
        />
      </template>

      <g-static-token-kubeconfig-configuration
        v-if="!isGardenloginType"
        :shoot-item="shootItem"
      />
    </template>
  </g-list-item>
  <g-list-item
    v-if="kubeconfigExpansionPanel"
    key="expansion-gardenlogin-kubeconfig"
  >
    <g-list-item-content>
      <g-code-block
        lang="yaml"
        :content="kubeconfig"
        :show-copy-button="false"
      />
    </g-list-item-content>
  </g-list-item>
</template>

<script>
import download from 'downloadjs'

import { shootItem } from '@/mixins/shootItem'

import GListItem from '@/components/GListItem.vue'
import GListItemContent from '@/components/GListItemContent.vue'
import GActionButton from '@/components/GActionButton.vue'
import GCopyBtn from '@/components/GCopyBtn.vue'
import GCodeBlock from '@/components/GCodeBlock.vue'
import GGardenloginInfo from '@/components/GGardenloginInfo.vue'
import GStaticTokenKubeconfigConfiguration from '@/components/GStaticTokenKubeconfigConfiguration.vue'

export default {
  components: {
    GListItem,
    GListItemContent,
    GActionButton,
    GCopyBtn,
    GCodeBlock,
    GGardenloginInfo,
    GStaticTokenKubeconfigConfiguration,
  },
  mixins: [shootItem],
  props: {
    showListIcon: {
      type: Boolean,
      default: false,
    },
    type: {
      type: String,
      default: 'gardenlogin',
    },
  },
  data () {
    return {
      kubeconfigExpansionPanel: false,
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
    },
  },
  watch: {
    kubeconfig (value) {
      this.reset()
    },
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
    },
  },
}
</script>
